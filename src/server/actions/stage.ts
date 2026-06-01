"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { encryptString } from "@/lib/crypto";
import {
  emailVerifierStageSubmitted,
  emailReferenceOutreach,
  emailRegistrarVerifications,
  emailEmployerVerifications,
} from "@/server/emails";
import { StageStatus, StageType, AddressType, DocumentKind, ConsentKind } from "@prisma/client";

// Stage submit actions throw plain Errors on validation failure (missing
// document, required field, etc.). Unwrapped, those throws hit the route error
// boundary and render a generic "Something went wrong" page — Next strips the
// real message in production. This wrapper catches the validation error and
// redirects back to the same stage with the message in ?err= so the form shows
// it inline. Next's own redirect()/notFound() control-flow errors carry a
// NEXT_* digest and are re-thrown untouched.
function withStageErrors(stagePath: string, fn: (formData: FormData) => Promise<void>) {
  return async (formData: FormData): Promise<void> => {
    try {
      await fn(formData);
    } catch (e) {
      const digest = (e as { digest?: unknown } | null)?.digest;
      if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
        throw e;
      }
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Could not save this stage. Please check the form and try again.";
      redirect(`${stagePath}?err=${encodeURIComponent(msg)}`);
    }
  };
}

// ---------- helpers ----------

async function getCandidateCase(userId: string) {
  const cand = await db.candidate.findUnique({ where: { userId }, include: { case: true, user: true } });
  if (!cand?.case) throw new Error("No active case");
  return { cand, kase: cand.case };
}

async function upsertStage(caseId: string, type: StageType, status: StageStatus, payload?: unknown) {
  return db.stage.upsert({
    where: { caseId_type: { caseId, type } },
    update: { status, submittedAt: status === StageStatus.SUBMITTED ? new Date() : undefined, payload: payload as any ?? undefined },
    create: { caseId, type, status, submittedAt: status === StageStatus.SUBMITTED ? new Date() : undefined, payload: payload as any ?? undefined },
  });
}

async function storeFile(file: File, opts: { kind: DocumentKind; caseId: string; stageId?: string }) {
  if (!file || file.size === 0) return null;
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "bin";
  const stored = await storage.put(buf, { contentType: file.type || "application/octet-stream", ext, subdir: opts.caseId });
  const doc = await db.document.create({
    data: {
      caseId: opts.caseId,
      stageId: opts.stageId,
      kind: opts.kind,
      filename: file.name,
      storagePath: stored.storagePath,
      contentType: stored.contentType,
      sizeBytes: stored.size,
      sha256: stored.sha256,
      encrypted: false,
    },
  });
  return doc;
}

async function transitionCaseStatus(caseId: string) {
  const stages = await db.stage.findMany({ where: { caseId } });
  const required = stages.length;
  const approved = stages.filter((s) => s.status === "APPROVED").length;
  const anySubmitted = stages.some((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW");
  const anyCorrection = stages.some((s) => s.status === "NEEDS_CORRECTION");
  const anyRejected = stages.some((s) => s.status === "REJECTED");

  let status: "DRAFT" | "IN_PROGRESS" | "AWAITING_REVIEW" | "NEEDS_CORRECTION" | "CLEARED" | "REJECTED";
  if (approved === required && required > 0) status = "CLEARED";
  else if (anyRejected) status = "REJECTED";
  else if (anyCorrection) status = "NEEDS_CORRECTION";
  else if (anySubmitted) status = "AWAITING_REVIEW";
  else status = "IN_PROGRESS";

  await db.case.update({ where: { id: caseId }, data: { status } });
}

// ---------- IDENTITY ----------

const identitySchema = z.object({
  legalFirstName: z.string().min(1).max(80),
  legalMiddleName: z.string().max(80).optional(),
  legalLastName: z.string().min(1).max(80),
  dob: z.string().min(4),
  documentType: z.enum(["PASSPORT", "DRIVER_LICENSE", "AADHAAR", "PAN", "SSN"]),
  documentNumber: z.string().min(2).max(40),
  nationality: z.string().min(2).max(60),
});

async function submitIdentityStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { cand, kase } = await getCandidateCase(s.user.id);
  const parsed = identitySchema.parse({
    legalFirstName: formData.get("legalFirstName"),
    legalMiddleName: formData.get("legalMiddleName") || undefined,
    legalLastName: formData.get("legalLastName"),
    dob: formData.get("dob"),
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    nationality: formData.get("nationality"),
  });
  const idFile = formData.get("idDocument") as File | null;

  await db.candidate.update({
    where: { id: cand.id },
    data: {
      legalFirstName: parsed.legalFirstName,
      legalMiddleName: parsed.legalMiddleName ?? null,
      legalLastName: parsed.legalLastName,
      dobEncrypted: encryptString(parsed.dob),
      nationality: parsed.nationality,
    },
  });

  const stage = await upsertStage(kase.id, "IDENTITY", "SUBMITTED", {
    documentType: parsed.documentType,
    documentNumber: parsed.documentNumber,
  });

  if (idFile) await storeFile(idFile, { kind: "ID_PROOF", caseId: kase.id, stageId: stage.id });

  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "IDENTITY" });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "IDENTITY" });

  revalidatePath("/me");
  redirect("/me");
}

// ---------- ADDRESS ----------

const addressSchema = z.object({
  type: z.enum(["CURRENT", "PERMANENT"]),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(2),
  country: z.string().min(2),
  fromDate: z.string().optional(),
});

async function submitAddressStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);

  const types = ["CURRENT", "PERMANENT"] as const;
  for (const t of types) {
    const present = formData.get(`${t}_line1`);
    if (!present) continue;
    const parsed = addressSchema.parse({
      type: t,
      line1: formData.get(`${t}_line1`),
      line2: formData.get(`${t}_line2`) || undefined,
      city: formData.get(`${t}_city`),
      state: formData.get(`${t}_state`),
      postalCode: formData.get(`${t}_postalCode`),
      country: formData.get(`${t}_country`),
      fromDate: formData.get(`${t}_fromDate`)?.toString() || undefined,
    });
    const proofFile = formData.get(`${t}_proof`) as File | null;
    let proofDocId: string | undefined;
    if (proofFile && proofFile.size > 0) {
      const doc = await storeFile(proofFile, { kind: "ADDRESS_PROOF", caseId: kase.id });
      proofDocId = doc?.id;
    }
    // delete previous of same type and insert fresh
    await db.address.deleteMany({ where: { caseId: kase.id, type: t as AddressType } });
    await db.address.create({
      data: {
        caseId: kase.id,
        type: t as AddressType,
        line1: parsed.line1,
        line2: parsed.line2 ?? null,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        country: parsed.country,
        fromDate: parsed.fromDate ? new Date(parsed.fromDate) : null,
        isCurrent: t === "CURRENT",
        proofDocId,
      },
    });
  }
  await upsertStage(kase.id, "ADDRESS", "SUBMITTED");
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "ADDRESS" });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "ADDRESS" });
  revalidatePath("/me");
  redirect("/me");
}

// ---------- EDUCATION ----------

const educationItem = z.object({
  level: z.string().min(1),
  board: z.string().min(1, "Board / University is required"),
  institution: z.string().min(1, "School / College is required"),
  degree: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  rollNumber: z.string().min(1, "Roll / Registration number is required"),
  startDate: z.string().min(4),
  endDate: z.string().min(4, "Year of passing is required"),
  gpa: z.string().min(1, "Percentage / CGPA is required"),
  registrarEmail: z.string().email().optional().or(z.literal("").transform(() => undefined)),
});

const REQUIRED_EDU_LEVELS = ["SSC", "Intermediate", "Bachelor"] as const;

async function submitEducationStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  const rows: number[] = [];
  for (const k of formData.keys()) {
    const m = k.match(/^edu_(\d+)_level$/);
    if (m && m[1] !== undefined) rows.push(Number(m[1]));
  }
  if (rows.length === 0) throw new Error("Add at least one education record");

  // Look up existing docs for this case to allow keeping prior uploads on resubmit
  const existing = await db.education.findMany({ where: { caseId: kase.id } });
  const existingByLevel = new Map(existing.map((e) => [e.level, e]));

  // Validate all rows first, then write — so a missing field doesn't half-delete records
  type Parsed = {
    i: number; level: string; board: string; institution: string; degree: string;
    fieldOfStudy: string | null; rollNumber: string; startDate: Date; endDate: Date;
    gpa: string; registrarEmail: string | null;
    transcript: File | null; certificate: File | null;
  };
  const parsedRows: Parsed[] = [];

  for (const i of rows) {
    const levelRaw = formData.get(`edu_${i}_level`)?.toString() ?? "";
    const fieldRaw = formData.get(`edu_${i}_field`)?.toString() ?? "";
    const p = educationItem.parse({
      level: levelRaw,
      board: formData.get(`edu_${i}_board`),
      institution: formData.get(`edu_${i}_institution`),
      degree: formData.get(`edu_${i}_degree`),
      fieldOfStudy: fieldRaw || undefined,
      rollNumber: formData.get(`edu_${i}_roll`),
      startDate: formData.get(`edu_${i}_startDate`),
      endDate: formData.get(`edu_${i}_endDate`),
      gpa: formData.get(`edu_${i}_gpa`),
      registrarEmail: formData.get(`edu_${i}_registrar`)?.toString() || undefined,
    });

    if ((p.level === "Intermediate" || p.level === "Bachelor") && !p.fieldOfStudy) {
      throw new Error(`${p.level}: stream / specialization is required`);
    }

    const transcript = formData.get(`edu_${i}_transcript`) as File | null;
    const certificate = formData.get(`edu_${i}_degreeDoc`) as File | null;
    const hadTranscript = !!existingByLevel.get(p.level)?.transcriptDocId;
    const hadCertificate = !!existingByLevel.get(p.level)?.degreeDocId;
    if ((!transcript || transcript.size === 0) && !hadTranscript) {
      throw new Error(`${p.level}: marksheet is required`);
    }
    if ((!certificate || certificate.size === 0) && !hadCertificate) {
      throw new Error(`${p.level}: passing/degree certificate is required`);
    }

    parsedRows.push({
      i,
      level: p.level,
      board: p.board,
      institution: p.institution,
      degree: p.degree,
      fieldOfStudy: p.fieldOfStudy ?? null,
      rollNumber: p.rollNumber,
      startDate: new Date(p.startDate),
      endDate: new Date(p.endDate),
      gpa: p.gpa,
      registrarEmail: p.registrarEmail ?? null,
      transcript: transcript && transcript.size > 0 ? transcript : null,
      certificate: certificate && certificate.size > 0 ? certificate : null,
    });
  }

  const submittedLevels = new Set(parsedRows.map((r) => r.level));
  for (const req of REQUIRED_EDU_LEVELS) {
    if (!submittedLevels.has(req)) {
      throw new Error(`${req} is mandatory for Indian candidates and was not provided`);
    }
  }

  // All good — replace
  await db.education.deleteMany({ where: { caseId: kase.id } });

  for (const r of parsedRows) {
    const prior = existingByLevel.get(r.level);
    const tDoc = r.transcript ? await storeFile(r.transcript, { kind: "EDUCATION_TRANSCRIPT", caseId: kase.id }) : null;
    const dDoc = r.certificate ? await storeFile(r.certificate, { kind: "EDUCATION_DEGREE", caseId: kase.id }) : null;

    await db.education.create({
      data: {
        caseId: kase.id,
        level: r.level,
        board: r.board,
        institution: r.institution,
        degree: r.degree,
        fieldOfStudy: r.fieldOfStudy,
        rollNumber: r.rollNumber,
        startDate: r.startDate,
        endDate: r.endDate,
        gpa: r.gpa,
        registrarEmail: r.registrarEmail,
        transcriptDocId: tDoc?.id ?? prior?.transcriptDocId ?? null,
        degreeDocId: dDoc?.id ?? prior?.degreeDocId ?? null,
      },
    });
  }

  await upsertStage(kase.id, "EDUCATION", "SUBMITTED");
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "EDUCATION", metadata: { levels: parsedRows.map((r) => r.level) } });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "EDUCATION" });
  // Reach out to registrars whose email the candidate provided
  await emailRegistrarVerifications({ caseId: kase.id });
  revalidatePath("/me");
  redirect("/me");
}

// ---------- EMPLOYMENT ----------

const employmentItem = z.object({
  employer: z.string().min(1),
  title: z.string().min(1),
  employmentType: z.string().min(1),
  startDate: z.string().min(4),
  endDate: z.string().optional(),
  isCurrent: z.string().optional(),
  managerName: z.string().optional(),
  managerEmail: z.string().email().optional(),
  managerPhone: z.string().optional(),
  reasonForLeaving: z.string().optional(),
});

async function submitEmploymentStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  const rows: number[] = [];
  for (const k of formData.keys()) {
    const m = k.match(/^emp_(\d+)_employer$/);
    if (m && m[1] !== undefined) rows.push(Number(m[1]));
  }

  await db.employment.deleteMany({ where: { caseId: kase.id } });
  for (const i of rows) {
    const parsed = employmentItem.parse({
      employer: formData.get(`emp_${i}_employer`),
      title: formData.get(`emp_${i}_title`),
      employmentType: formData.get(`emp_${i}_type`),
      startDate: formData.get(`emp_${i}_startDate`),
      endDate: formData.get(`emp_${i}_endDate`)?.toString() || undefined,
      isCurrent: formData.get(`emp_${i}_isCurrent`)?.toString() || undefined,
      managerName: formData.get(`emp_${i}_mgrName`)?.toString() || undefined,
      managerEmail: formData.get(`emp_${i}_mgrEmail`)?.toString() || undefined,
      managerPhone: formData.get(`emp_${i}_mgrPhone`)?.toString() || undefined,
      reasonForLeaving: formData.get(`emp_${i}_reason`)?.toString() || undefined,
    });
    const offer = formData.get(`emp_${i}_offer`) as File | null;
    const relieving = formData.get(`emp_${i}_relieving`) as File | null;
    const payslip = formData.get(`emp_${i}_payslip`) as File | null;
    const offerDoc = offer && offer.size > 0 ? await storeFile(offer, { kind: "EMPLOYMENT_OFFER", caseId: kase.id }) : null;
    const relievingDoc = relieving && relieving.size > 0 ? await storeFile(relieving, { kind: "EMPLOYMENT_RELIEVING", caseId: kase.id }) : null;
    const payslipDoc = payslip && payslip.size > 0 ? await storeFile(payslip, { kind: "EMPLOYMENT_PAYSLIP", caseId: kase.id }) : null;

    await db.employment.create({
      data: {
        caseId: kase.id,
        employer: parsed.employer,
        title: parsed.title,
        employmentType: parsed.employmentType,
        startDate: new Date(parsed.startDate),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        isCurrent: parsed.isCurrent === "on",
        managerName: parsed.managerName ?? null,
        managerEmail: parsed.managerEmail ?? null,
        managerPhone: parsed.managerPhone ?? null,
        reasonForLeaving: parsed.reasonForLeaving ?? null,
        offerLetterDocId: offerDoc?.id,
        relievingDocId: relievingDoc?.id,
        payslipDocId: payslipDoc?.id,
      },
    });
  }
  await upsertStage(kase.id, "EMPLOYMENT", "SUBMITTED");
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "EMPLOYMENT" });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "EMPLOYMENT" });
  // Reach out to former employers/managers
  await emailEmployerVerifications({ caseId: kase.id });
  revalidatePath("/me");
  redirect("/me");
}

// ---------- CRIMINAL ----------

const criminalSchema = z.object({
  jurisdictions: z.string().min(1),
  consentName: z.string().min(1),
  consentAcknowledged: z.literal("on"),
  declarations: z.string().optional(),
});

async function submitCriminalStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  const parsed = criminalSchema.parse({
    jurisdictions: formData.get("jurisdictions"),
    consentName: formData.get("consentName"),
    consentAcknowledged: formData.get("consentAcknowledged"),
    declarations: formData.get("declarations") || undefined,
  });
  await db.consentRecord.create({
    data: {
      caseId: kase.id,
      kind: ConsentKind.CRIMINAL,
      signedName: parsed.consentName,
      textHash: "fcra-v1",
    },
  });
  await upsertStage(kase.id, "CRIMINAL", "SUBMITTED", {
    jurisdictions: parsed.jurisdictions.split(",").map((j) => j.trim()).filter(Boolean),
    declarations: parsed.declarations ?? null,
  });
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "CRIMINAL" });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "CRIMINAL" });
  revalidatePath("/me");
  redirect("/me");
}

// ---------- VETERAN ----------

const veteranSchema = z.object({
  branch: z.string().min(1),
  serviceStart: z.string().min(4),
  serviceEnd: z.string().optional(),
  serviceNumber: z.string().optional(),
  characterOfService: z.string().optional(),
});

async function submitVeteranStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  const parsed = veteranSchema.parse({
    branch: formData.get("branch"),
    serviceStart: formData.get("serviceStart"),
    serviceEnd: formData.get("serviceEnd") || undefined,
    serviceNumber: formData.get("serviceNumber") || undefined,
    characterOfService: formData.get("characterOfService") || undefined,
  });
  const discharge = formData.get("discharge") as File | null;
  const dischargeDoc = discharge && discharge.size > 0
    ? await storeFile(discharge, { kind: "VETERAN_DISCHARGE", caseId: kase.id })
    : null;
  await db.veteranRecord.deleteMany({ where: { caseId: kase.id } });
  await db.veteranRecord.create({
    data: {
      caseId: kase.id,
      branch: parsed.branch,
      serviceStart: new Date(parsed.serviceStart),
      serviceEnd: parsed.serviceEnd ? new Date(parsed.serviceEnd) : null,
      serviceNumber: parsed.serviceNumber ? encryptString(parsed.serviceNumber) : null,
      characterOfService: parsed.characterOfService ?? null,
      dischargeDocId: dischargeDoc?.id,
    },
  });
  await upsertStage(kase.id, "VETERAN", "SUBMITTED");
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "VETERAN" });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "VETERAN" });
  revalidatePath("/me");
  redirect("/me");
}

// ---------- PHOTO ----------

async function submitPhotoStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  const selfie = formData.get("selfie") as File | null;
  if (!selfie || selfie.size === 0) throw new Error("Selfie is required");
  await storeFile(selfie, { kind: "PHOTO_SELFIE", caseId: kase.id });
  await upsertStage(kase.id, "PHOTO", "SUBMITTED");
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "PHOTO" });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "PHOTO" });
  revalidatePath("/me");
  redirect("/me");
}

// ---------- VIDEO ----------

async function submitVideoStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  const rec = formData.get("recording") as File | null;
  const phrase = formData.get("phrase")?.toString() ?? "";
  if (!rec || rec.size === 0) throw new Error("Recording is required");
  await storeFile(rec, { kind: "VIDEO_RECORDING", caseId: kase.id });
  await upsertStage(kase.id, "VIDEO", "SUBMITTED", { phrase });
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "VIDEO" });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "VIDEO" });
  revalidatePath("/me");
  redirect("/me");
}

// ---------- REFERENCES ----------

const refItem = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  employer: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  yearsKnown: z.string().optional(),
});

async function submitReferenceStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  const rows: number[] = [];
  for (const k of formData.keys()) {
    const m = k.match(/^ref_(\d+)_name$/);
    if (m && m[1] !== undefined) rows.push(Number(m[1]));
  }
  if (rows.length < 2) throw new Error("At least two references are required");

  await db.reference.deleteMany({ where: { caseId: kase.id } });
  for (const i of rows) {
    const parsed = refItem.parse({
      name: formData.get(`ref_${i}_name`),
      relationship: formData.get(`ref_${i}_relationship`),
      employer: formData.get(`ref_${i}_employer`)?.toString() || undefined,
      email: formData.get(`ref_${i}_email`),
      phone: formData.get(`ref_${i}_phone`)?.toString() || undefined,
      yearsKnown: formData.get(`ref_${i}_years`)?.toString() || undefined,
    });
    await db.reference.create({
      data: {
        caseId: kase.id,
        name: parsed.name,
        relationship: parsed.relationship,
        employer: parsed.employer ?? null,
        email: parsed.email,
        phone: parsed.phone ?? null,
        yearsKnown: parsed.yearsKnown ? Number(parsed.yearsKnown) : null,
      },
    });
  }
  await upsertStage(kase.id, "REFERENCE", "SUBMITTED");
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "REFERENCE" });
  await transitionCaseStatus(kase.id);
  await emailVerifierStageSubmitted({ caseId: kase.id, stage: "REFERENCE" });
  // Outreach to each reference with a single-use link
  await emailReferenceOutreach({ caseId: kase.id });
  revalidatePath("/me");
  redirect("/me");
}

// (Stage submitted -> verifier notification lives in src/server/emails.ts)


// Public stage actions — validation errors surface inline (see withStageErrors).
export const submitIdentityStage = withStageErrors("/me/stage/identity", submitIdentityStageImpl);
export const submitAddressStage = withStageErrors("/me/stage/address", submitAddressStageImpl);
export const submitEducationStage = withStageErrors("/me/stage/education", submitEducationStageImpl);
export const submitEmploymentStage = withStageErrors("/me/stage/employment", submitEmploymentStageImpl);
export const submitCriminalStage = withStageErrors("/me/stage/criminal", submitCriminalStageImpl);
export const submitVeteranStage = withStageErrors("/me/stage/veteran", submitVeteranStageImpl);
export const submitPhotoStage = withStageErrors("/me/stage/photo", submitPhotoStageImpl);
export const submitVideoStage = withStageErrors("/me/stage/video", submitVideoStageImpl);
export const submitReferenceStage = withStageErrors("/me/stage/reference", submitReferenceStageImpl);

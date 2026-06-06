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
  emailRegistrarVerifications,
  emailEmployerVerifications,
  emailProfileSubmittedForBgv,
} from "@/server/emails";
import { notifyStageSubmitted, notifyBgvTeam } from "@/server/notify";
import { computeCaseStatus, requiredStagesForCase } from "@/lib/stages";
import { stageLabels } from "@/lib/utils";
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
  const kase = await db.case.findUnique({
    where: { id: caseId },
    select: { requiredStages: true, stages: { select: { type: true, status: true } } },
  });
  if (!kase) return;
  // Shared required-set status math — see computeCaseStatus for why stray
  // stage rows (retired REFERENCE, candidate-type leftovers) are excluded.
  const status = computeCaseStatus(kase, kase.stages);
  await db.case.update({ where: { id: caseId }, data: { status } });
}

/**
 * The required stage set for a case the candidate is acting on. Short-circuits
 * on the stored `requiredStages`; only legacy cases (provisioned before the
 * column existed) pay for the stage-row fallback query.
 */
async function requiredStageSetFor(kase: { id: string; requiredStages: StageType[] }): Promise<StageType[]> {
  const configured = requiredStagesForCase(kase);
  if (configured.length > 0) return configured;
  const rows = await db.stage.findMany({ where: { caseId: kase.id }, select: { type: true } });
  return requiredStagesForCase(kase, rows);
}

// Candidates can POST any stage action/draft directly — never trust the
// requested stage to be part of their case. Without this, a forged request
// upserts a row for an unprovisioned stage (e.g. VETERAN, or the retired
// REFERENCE), distorting the dashboard and the desk's "all submitted" signal.
async function requireStageInCase(kase: { id: string; requiredStages: StageType[] }, type: StageType) {
  const required = await requiredStageSetFor(kase);
  if (!required.includes(type)) {
    throw new Error("This stage isn't part of your verification case.");
  }
}

// Notify the BGV desk (in-app bell) that a stage was submitted. Loads the
// candidate name + reference off the case and delegates to the shared helper.
// Per-stage *emails* to the verifier are intentionally NOT sent here — the
// verifier is emailed once at final "Submit profile for BGV".
async function notifyStageSubmittedFor(caseId: string, type: StageType) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { candidate: { include: { user: true } } },
  });
  if (!c) return;
  const candidateName = c.candidate.user.name ?? c.candidate.user.email;
  await notifyStageSubmitted(caseId, {
    stageLabel: stageLabels[type],
    candidateName,
    reference: c.reference,
  });
}

// ---------- DRAFTS (save progress without submitting) ----------

// A draft can only be saved while the stage is still editable — never overwrite a
// stage the candidate already submitted / a verifier is reviewing or approved.
async function guardDraftable(caseId: string, type: StageType) {
  const st = await db.stage.findUnique({
    where: { caseId_type: { caseId, type } },
    select: { status: true },
  });
  if (st && (st.status === "SUBMITTED" || st.status === "UNDER_REVIEW" || st.status === "APPROVED")) {
    throw new Error("This stage is already submitted and can't be edited.");
  }
}

// Map a draft file field to its document kind so an uploaded file is retained
// (the same kinds the submit actions use).
function draftDocKind(field: string): DocumentKind {
  if (field === "idDocument") return DocumentKind.ID_PROOF;
  if (field === "selfie") return DocumentKind.PHOTO_SELFIE;
  if (field === "recording") return DocumentKind.VIDEO_RECORDING;
  if (field === "discharge") return DocumentKind.VETERAN_DISCHARGE;
  if (field.endsWith("_proof")) return DocumentKind.ADDRESS_PROOF;
  if (field.includes("transcript")) return DocumentKind.EDUCATION_TRANSCRIPT;
  if (field.includes("degreeDoc")) return DocumentKind.EDUCATION_DEGREE;
  if (field.includes("offer")) return DocumentKind.EMPLOYMENT_OFFER;
  if (field.includes("relieving")) return DocumentKind.EMPLOYMENT_RELIEVING;
  if (field.includes("payslip")) return DocumentKind.EMPLOYMENT_PAYSLIP;
  return DocumentKind.OTHER;
}

/**
 * Generic "Save draft" — works for every stage. Dumps the entered text fields and
 * persists any selected files (so documents survive the round-trip) into the
 * stage's payload under `__draft`, keeping the stage editable (IN_PROGRESS). No
 * validation, no verifier email/notification. The form prefills from `__draft`
 * on return (see each stage page). A hidden `__stage` field names the stage.
 */
// Never persist these as plaintext in the draft payload — they're encrypted at
// rest only on final submit. The candidate re-enters them when submitting.
const DRAFT_SENSITIVE = new Set(["dob", "documentNumber", "serviceNumber"]);

type StageDraft = {
  fields: Record<string, string>;
  files: Record<string, { id: string; filename: string }>;
};

/**
 * Persist whatever the candidate typed/selected into the stage's `__draft`
 * payload so a FAILED submit (validation error → ?err= redirect) doesn't wipe
 * the form. Shared by "Save draft" and called FIRST in every submit impl.
 * Excludes sensitive fields. Files are stored once here and the resulting
 * Document ids are RETURNED so the submit impls reuse them instead of storing
 * the same bytes a second time (which double-stored every upload).
 *
 * Fields REPLACE the prior draft (the form posts every rendered field, so a
 * cleared input or a removed repeatable row must not resurrect from an older
 * save); files MERGE (file inputs post empty unless re-selected, and earlier
 * uploads must survive the round-trip).
 *
 * The stage's current status is preserved — in particular a draft save on a
 * NEEDS_CORRECTION stage must NOT demote it to IN_PROGRESS (that hides the
 * verifier's feedback and lets transitionCaseStatus flip the case back to
 * AWAITING_REVIEW with the stage unfixed). Only NOT_STARTED moves forward.
 */
async function persistDraftFromForm(
  caseId: string,
  type: StageType,
  formData: FormData,
): Promise<StageDraft> {
  const fields: Record<string, string> = {};
  const files: StageDraft["files"] = {};
  for (const [k, v] of formData.entries()) {
    if (k === "__stage" || DRAFT_SENSITIVE.has(k)) continue;
    if (typeof v === "string") {
      if (v.trim()) fields[k] = v;
    } else if (v instanceof File && v.size > 0) {
      const doc = await storeFile(v, { kind: draftDocKind(k), caseId });
      if (doc) files[k] = { id: doc.id, filename: doc.filename };
    }
  }

  const existing = await db.stage.findUnique({
    where: { caseId_type: { caseId, type } },
    select: { payload: true, status: true },
  });
  const payload = (existing?.payload ?? {}) as Record<string, unknown>;
  const priorDraft = (payload.__draft ?? {}) as { files?: StageDraft["files"] };
  const draft: StageDraft = {
    fields,
    files: { ...(priorDraft.files ?? {}), ...files },
  };
  payload.__draft = { ...draft, savedAt: new Date().toISOString() };

  const status =
    !existing || existing.status === "NOT_STARTED" ? StageStatus.IN_PROGRESS : existing.status;
  await upsertStage(caseId, type, status, payload);
  return draft;
}

// The client-supplied __stage field is untrusted: parse it against the enum
// (never cast blindly) before it reaches a Prisma query.
function parseStageType(raw: string): StageType | null {
  const upper = raw.toUpperCase();
  return (Object.values(StageType) as string[]).includes(upper) ? (upper as StageType) : null;
}

async function saveStageDraftImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  const type = parseStageType(formData.get("__stage")?.toString() ?? "");
  if (!type) throw new Error("Missing stage");
  await requireStageInCase(kase, type);
  await guardDraftable(kase.id, type);

  await persistDraftFromForm(kase.id, type, formData);
  await transitionCaseStatus(kase.id);
}

// Public draft action — redirects back to the stage with ?saved=1 (or ?err= on
// failure). Errors/redirects with a NEXT_* digest pass through untouched.
export async function saveStageDraft(formData: FormData): Promise<void> {
  const type = parseStageType(formData.get("__stage")?.toString() ?? "");
  // No recognizable stage → no stage route to land on; fall back to the
  // dashboard instead of redirecting into the non-route /me/stage/ (404).
  const path = type ? `/me/stage/${type.toLowerCase()}` : "/me";
  try {
    await saveStageDraftImpl(formData);
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
      throw e;
    }
    const msg = e instanceof Error && e.message ? e.message : "Could not save your draft.";
    redirect(`${path}?err=${encodeURIComponent(msg)}`);
  }
  redirect(`${path}?saved=1`);
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
  await requireStageInCase(kase, "IDENTITY");
  // Persist what was typed FIRST so a validation failure re-fills the form.
  // This also stores any uploaded file ONCE — submit reuses the Document id.
  const draft = await persistDraftFromForm(kase.id, "IDENTITY", formData);

  // Validate everything BEFORE any destructive write.
  const parsed = identitySchema.parse({
    legalFirstName: formData.get("legalFirstName"),
    legalMiddleName: formData.get("legalMiddleName") || undefined,
    legalLastName: formData.get("legalLastName"),
    dob: formData.get("dob"),
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    nationality: formData.get("nationality"),
  });

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

  // Replacing the payload wholesale also clears __draft, so the next edit
  // prefills from the real submitted values instead of a stale draft.
  const stage = await upsertStage(kase.id, "IDENTITY", "SUBMITTED", {
    documentType: parsed.documentType,
    documentNumber: parsed.documentNumber,
  });

  // Link the draft-stored upload (from this POST or an earlier Save draft) to
  // the stage — no second storeFile.
  const idDocId = draft.files["idDocument"]?.id;
  if (idDocId) {
    await db.document.update({ where: { id: idDocId }, data: { stageId: stage.id } });
  }

  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "IDENTITY" });
  await transitionCaseStatus(kase.id);
  await notifyStageSubmittedFor(kase.id, "IDENTITY");

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
  await requireStageInCase(kase, "ADDRESS");
  // Persist what was typed FIRST so a validation failure re-fills the form.
  // This also stores any uploaded files ONCE — submit reuses the Document ids.
  const draft = await persistDraftFromForm(kase.id, "ADDRESS", formData);

  // Prior rows let a text-only resubmit (e.g. after NEEDS_CORRECTION) keep the
  // previously uploaded proof instead of silently wiping it.
  const priorAddresses = await db.address.findMany({ where: { caseId: kase.id } });
  const priorByType = new Map(priorAddresses.map((a) => [a.type, a]));

  const types = ["CURRENT", "PERMANENT"] as const;

  // Validate ALL present types first, then perform destructive writes — so a
  // missing field on PERMANENT doesn't half-delete the CURRENT address.
  type ParsedAddr = {
    type: AddressType;
    line1: string; line2: string | null; city: string; state: string;
    postalCode: string; country: string; fromDate: Date | null;
    proofDocId?: string;
  };
  const toWrite: ParsedAddr[] = [];

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
    // New upload (stored by the draft persist above) → fresh doc; otherwise
    // keep the proof from the previous submit.
    const proofDocId =
      draft.files[`${t}_proof`]?.id ?? priorByType.get(t as AddressType)?.proofDocId ?? undefined;
    toWrite.push({
      type: t as AddressType,
      line1: parsed.line1,
      line2: parsed.line2 ?? null,
      city: parsed.city,
      state: parsed.state,
      postalCode: parsed.postalCode,
      country: parsed.country,
      fromDate: parsed.fromDate ? new Date(parsed.fromDate) : null,
      proofDocId,
    });
  }

  // All validated — delete + insert fresh inside a transaction so a failure rolls back.
  await db.$transaction(async (tx) => {
    for (const a of toWrite) {
      await tx.address.deleteMany({ where: { caseId: kase.id, type: a.type } });
      await tx.address.create({
        data: {
          caseId: kase.id,
          type: a.type,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          postalCode: a.postalCode,
          country: a.country,
          fromDate: a.fromDate,
          isCurrent: a.type === "CURRENT",
          proofDocId: a.proofDocId,
        },
      });
    }
  });

  // Empty payload clears __draft so the next edit prefills from the rows above.
  await upsertStage(kase.id, "ADDRESS", "SUBMITTED", {});
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "ADDRESS" });
  await transitionCaseStatus(kase.id);
  await notifyStageSubmittedFor(kase.id, "ADDRESS");
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
  await requireStageInCase(kase, "EDUCATION");
  // Persist what was typed FIRST so a validation failure re-fills the form.
  // This also stores any uploaded files ONCE — submit reuses the Document ids.
  const draft = await persistDraftFromForm(kase.id, "EDUCATION", formData);

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
    });
  }

  const submittedLevels = new Set(parsedRows.map((r) => r.level));
  for (const req of REQUIRED_EDU_LEVELS) {
    if (!submittedLevels.has(req)) {
      throw new Error(`${req} is mandatory for Indian candidates and was not provided`);
    }
  }

  // All validated — replace records inside a transaction so a failure rolls
  // back the delete. Documents (marksheet + degree/passing certificate) are
  // OPTIONAL and reused from the draft persist above (no second storeFile);
  // when no new file was provided keep the prior upload, never overwrite with null.
  const writes = parsedRows.map((r) => {
    const prior = existingByLevel.get(r.level);
    return {
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
      transcriptDocId: draft.files[`edu_${r.i}_transcript`]?.id ?? prior?.transcriptDocId ?? null,
      degreeDocId: draft.files[`edu_${r.i}_degreeDoc`]?.id ?? prior?.degreeDocId ?? null,
    };
  });

  await db.$transaction(async (tx) => {
    await tx.education.deleteMany({ where: { caseId: kase.id } });
    for (const data of writes) {
      await tx.education.create({ data });
    }
  });

  // Empty payload clears __draft so the next edit prefills from the rows above.
  await upsertStage(kase.id, "EDUCATION", "SUBMITTED", {});
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "EDUCATION", metadata: { levels: parsedRows.map((r) => r.level) } });
  await transitionCaseStatus(kase.id);
  await notifyStageSubmittedFor(kase.id, "EDUCATION");
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
  await requireStageInCase(kase, "EMPLOYMENT");
  // Persist what was typed FIRST so a validation failure re-fills the form.
  // This also stores any uploaded files ONCE — submit reuses the Document ids.
  const draft = await persistDraftFromForm(kase.id, "EMPLOYMENT", formData);

  const rows: number[] = [];
  for (const k of formData.keys()) {
    const m = k.match(/^emp_(\d+)_employer$/);
    if (m && m[1] !== undefined) rows.push(Number(m[1]));
  }

  // Prior rows (keyed by employer) let a text-only resubmit keep previously
  // uploaded offer/relieving/payslip docs instead of silently wiping them.
  const priorEmployments = await db.employment.findMany({ where: { caseId: kase.id } });
  const priorByEmployer = new Map(priorEmployments.map((e) => [e.employer.trim().toLowerCase(), e]));

  // Validate every row BEFORE deleting anything, so a bad row never wipes the
  // candidate's existing employment history.
  const writes = rows.map((i) => {
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
    const prior = priorByEmployer.get(parsed.employer.trim().toLowerCase());
    return {
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
      offerLetterDocId: draft.files[`emp_${i}_offer`]?.id ?? prior?.offerLetterDocId ?? undefined,
      relievingDocId: draft.files[`emp_${i}_relieving`]?.id ?? prior?.relievingDocId ?? undefined,
      payslipDocId: draft.files[`emp_${i}_payslip`]?.id ?? prior?.payslipDocId ?? undefined,
    };
  });

  // All validated — delete + insert fresh inside a transaction.
  await db.$transaction(async (tx) => {
    await tx.employment.deleteMany({ where: { caseId: kase.id } });
    for (const data of writes) {
      await tx.employment.create({ data });
    }
  });

  // Empty payload clears __draft so the next edit prefills from the rows above.
  await upsertStage(kase.id, "EMPLOYMENT", "SUBMITTED", {});
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "EMPLOYMENT" });
  await transitionCaseStatus(kase.id);
  await notifyStageSubmittedFor(kase.id, "EMPLOYMENT");
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
  await requireStageInCase(kase, "CRIMINAL");
  // Persist what was typed FIRST so a validation failure re-fills the form.
  await persistDraftFromForm(kase.id, "CRIMINAL", formData);

  // Validate everything BEFORE any write.
  const parsed = criminalSchema.parse({
    jurisdictions: formData.get("jurisdictions"),
    consentName: formData.get("consentName"),
    consentAcknowledged: formData.get("consentAcknowledged"),
    declarations: formData.get("declarations") || undefined,
  });
  await db.$transaction(async (tx) => {
    await tx.consentRecord.create({
      data: {
        caseId: kase.id,
        kind: ConsentKind.CRIMINAL,
        signedName: parsed.consentName,
        textHash: "fcra-v1",
      },
    });
  });
  await upsertStage(kase.id, "CRIMINAL", "SUBMITTED", {
    jurisdictions: parsed.jurisdictions.split(",").map((j) => j.trim()).filter(Boolean),
    declarations: parsed.declarations ?? null,
  });
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "CRIMINAL" });
  await transitionCaseStatus(kase.id);
  await notifyStageSubmittedFor(kase.id, "CRIMINAL");
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
  await requireStageInCase(kase, "VETERAN");
  // Persist what was typed FIRST so a validation failure re-fills the form.
  // This also stores any uploaded file ONCE — submit reuses the Document id.
  const draft = await persistDraftFromForm(kase.id, "VETERAN", formData);

  // Validate everything BEFORE deleting.
  const parsed = veteranSchema.parse({
    branch: formData.get("branch"),
    serviceStart: formData.get("serviceStart"),
    serviceEnd: formData.get("serviceEnd") || undefined,
    serviceNumber: formData.get("serviceNumber") || undefined,
    characterOfService: formData.get("characterOfService") || undefined,
  });
  // New upload from the draft persist, else keep the previously submitted doc
  // so a text-only resubmit never wipes it.
  const priorVeteran = await db.veteranRecord.findFirst({ where: { caseId: kase.id } });
  const dischargeDocId = draft.files["discharge"]?.id ?? priorVeteran?.dischargeDocId ?? undefined;

  await db.$transaction(async (tx) => {
    await tx.veteranRecord.deleteMany({ where: { caseId: kase.id } });
    await tx.veteranRecord.create({
      data: {
        caseId: kase.id,
        branch: parsed.branch,
        serviceStart: new Date(parsed.serviceStart),
        serviceEnd: parsed.serviceEnd ? new Date(parsed.serviceEnd) : null,
        serviceNumber: parsed.serviceNumber ? encryptString(parsed.serviceNumber) : null,
        characterOfService: parsed.characterOfService ?? null,
        dischargeDocId,
      },
    });
  });
  // Empty payload clears __draft so the next edit prefills from the record above.
  await upsertStage(kase.id, "VETERAN", "SUBMITTED", {});
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "VETERAN" });
  await transitionCaseStatus(kase.id);
  await notifyStageSubmittedFor(kase.id, "VETERAN");
  revalidatePath("/me");
  redirect("/me");
}

// ---------- PHOTO ----------

async function submitPhotoStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  await requireStageInCase(kase, "PHOTO");
  // Persist the selected file FIRST so a failed submit re-fills the form. The
  // selfie is acceptable from EITHER this POST or an earlier "Save draft" (the
  // page tells the candidate a draft-saved file doesn't need re-selecting).
  const draft = await persistDraftFromForm(kase.id, "PHOTO", formData);
  const selfieDocId = draft.files["selfie"]?.id;
  if (!selfieDocId) throw new Error("Selfie is required");
  // Empty payload clears __draft; link the stored document to the stage
  // instead of storing the same bytes a second time.
  const stage = await upsertStage(kase.id, "PHOTO", "SUBMITTED", {});
  await db.document.update({ where: { id: selfieDocId }, data: { stageId: stage.id } });
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "PHOTO" });
  await transitionCaseStatus(kase.id);
  await notifyStageSubmittedFor(kase.id, "PHOTO");
  revalidatePath("/me");
  redirect("/me");
}

// ---------- VIDEO ----------

async function submitVideoStageImpl(formData: FormData) {
  const s = await requireRole("CANDIDATE");
  const { kase } = await getCandidateCase(s.user.id);
  await requireStageInCase(kase, "VIDEO");
  const phrase = formData.get("phrase")?.toString() ?? "";
  // Persist the recording + phrase FIRST so a failed submit re-fills the form.
  // The recording is acceptable from EITHER this POST or an earlier "Save draft".
  const draft = await persistDraftFromForm(kase.id, "VIDEO", formData);
  const recordingDocId = draft.files["recording"]?.id;
  if (!recordingDocId) throw new Error("Recording is required");
  // Payload replaced wholesale (clears __draft); link the stored document to
  // the stage instead of storing the same bytes a second time.
  const stage = await upsertStage(kase.id, "VIDEO", "SUBMITTED", { phrase });
  await db.document.update({ where: { id: recordingDocId }, data: { stageId: stage.id } });
  await audit({ actorId: s.user.id, caseId: kase.id, action: "stage.submitted", target: "VIDEO" });
  await transitionCaseStatus(kase.id);
  await notifyStageSubmittedFor(kase.id, "VIDEO");
  revalidatePath("/me");
  redirect("/me");
}

// (Reference stage retired — its model + REFERENCE enum value are kept in the
// schema to avoid a migration, but candidates no longer submit references.)

// (Stage submitted -> in-app BGV notification lives in notifyStageSubmittedFor;
//  the verifier is emailed once at final submit — see submitProfileForBgv.)

// ---------- FINAL SUBMIT (candidate sends the whole profile to BGV) ----------

async function submitProfileForBgvImpl() {
  const s = await requireRole("CANDIDATE");
  const { cand, kase } = await getCandidateCase(s.user.id);

  // Required stages = what was actually provisioned on the case, NOT a
  // re-derivation from candidateType (which disagrees for portal cases with a
  // custom requiredStages set and would gate submit on stages that don't exist).
  const stages = await db.stage.findMany({
    where: { caseId: kase.id },
    select: { type: true, status: true },
  });
  const required = requiredStagesForCase(kase, stages);
  const statusByType = new Map(stages.map((st) => [st.type, st.status]));
  const isDone = (st?: StageStatus) =>
    st === "SUBMITTED" || st === "UNDER_REVIEW" || st === "APPROVED";

  const incomplete = required.filter((t) => !isDone(statusByType.get(t)));
  if (incomplete.length > 0) {
    throw new Error("Please complete and submit all stages before submitting your profile.");
  }

  // Move the case to AWAITING_REVIEW (no-op if already there / further along).
  await transitionCaseStatus(kase.id);

  // ONE consolidated email to the BGV team — idempotent per case.
  const already = await db.emailLog.findFirst({
    where: { caseId: kase.id, templateId: "profile.submitted.bgv" },
  });
  if (!already) {
    await emailProfileSubmittedForBgv({ caseId: kase.id });
  }

  // In-app bell for the desk. No PROFILE_SUBMITTED kind exists — reuse GENERIC
  // (the same kind notifyStageSubmitted uses for its "all stages submitted" ping).
  const candidateName = cand.user.name ?? cand.user.email;
  await notifyBgvTeam(kase.id, {
    kind: "GENERIC",
    title: "Profile submitted for BGV",
    body: `${candidateName} has submitted their full profile (${kase.reference}). The case is ready for review.`,
    link: `/work/case/${kase.id}`,
  });

  await audit({ actorId: s.user.id, caseId: kase.id, action: "profile.submitted", target: kase.reference });

  revalidatePath("/me");
  redirect("/me?submitted=1");
}

/**
 * Final candidate action: confirm the whole profile is complete and hand the case
 * to the BGV team. Requires every required stage (by candidate type + veteran) to
 * be at least SUBMITTED. Emails the verifier once (idempotent) and pings the desk.
 * Errors surface on /me/review via ?err= (same pattern as withStageErrors).
 */
export async function submitProfileForBgv(_formData?: FormData): Promise<void> {
  try {
    await submitProfileForBgvImpl();
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
      throw e;
    }
    const msg =
      e instanceof Error && e.message
        ? e.message
        : "Could not submit your profile. Please try again.";
    redirect(`/me/review?err=${encodeURIComponent(msg)}`);
  }
}


// Public stage actions — validation errors surface inline (see withStageErrors).
export const submitIdentityStage = withStageErrors("/me/stage/identity", submitIdentityStageImpl);
export const submitAddressStage = withStageErrors("/me/stage/address", submitAddressStageImpl);
export const submitEducationStage = withStageErrors("/me/stage/education", submitEducationStageImpl);
export const submitEmploymentStage = withStageErrors("/me/stage/employment", submitEmploymentStageImpl);
export const submitCriminalStage = withStageErrors("/me/stage/criminal", submitCriminalStageImpl);
export const submitVeteranStage = withStageErrors("/me/stage/veteran", submitVeteranStageImpl);
export const submitPhotoStage = withStageErrors("/me/stage/photo", submitPhotoStageImpl);
export const submitVideoStage = withStageErrors("/me/stage/video", submitVideoStageImpl);

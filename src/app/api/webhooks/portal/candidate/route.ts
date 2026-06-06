// Inbound webhook: portal → launchpad case provisioning.
//
// The company portal POSTs here once a candidate finishes interviews and is
// ready to start BGV. We:
//   1. Verify the HMAC signature (X-Portal-Signature) against PORTAL_WEBHOOK_SECRET.
//   2. Idempotently create (or fetch) the User + Candidate + Case for this
//      portal candidate, keyed on (candidateRef.kind, candidateRef.id).
//   3. Generate a magic-link via the existing VerificationToken flow
//      (matches src/server/actions/auth.ts).
//   4. Email the candidate the magic link + reference number.
//   5. Reply with { caseId, reference, magicLink, action }.

import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { hash } from "argon2";
import {
  CandidateType,
  Role,
  StageType,
  type Prisma,
} from "@prisma/client";
import { stagesForCandidateType } from "@/lib/stages";
import { isUniqueViolation, withUniqueCaseReference } from "@/lib/case-reference";
import { db } from "@/lib/db";
import { notifyBgvTeam } from "@/server/notify";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { randomBytes } from "node:crypto";
import { sendMail } from "@/lib/mailer";
import { tpl } from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────── Types & validation ────────────────────────────

type CandidateKind = "JOB" | "INTERNSHIP";
type PortalCandidateType = "EMPLOYEE" | "INTERN";

interface PortalCandidatePayload {
  candidateRef: { kind: CandidateKind; id: string; code: string };
  fullName: string;
  email: string;
  phone?: string | null;
  positionTitle?: string | null;
  hiringManager?: string | null;
  candidateType: PortalCandidateType;
  startDate?: string | null;
  requiredStages?: StageType[] | null;
}

const VALID_STAGE_TYPES = new Set<string>(Object.values(StageType));

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validatePayload(
  raw: unknown,
): { ok: true; data: PortalCandidatePayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "body must be an object" };
  const o = raw as Record<string, unknown>;

  const ref = o.candidateRef as Record<string, unknown> | undefined;
  if (!ref || typeof ref !== "object") return { ok: false, error: "candidateRef required" };
  if (ref.kind !== "JOB" && ref.kind !== "INTERNSHIP") {
    return { ok: false, error: "candidateRef.kind must be JOB or INTERNSHIP" };
  }
  if (!isNonEmptyString(ref.id)) return { ok: false, error: "candidateRef.id required" };
  // code is a human-readable display reference (shown in the invite email). It is
  // NOT an idempotency key — the case is keyed on (kind, id). Older / partial
  // callers (e.g. the internship handoff before it sent a code) may omit it, so
  // fall back to the id rather than hard-rejecting the whole handoff with a 400.
  const refCode = isNonEmptyString(ref.code) ? (ref.code as string) : (ref.id as string);

  if (!isNonEmptyString(o.fullName)) return { ok: false, error: "fullName required" };
  if (!isNonEmptyString(o.email)) return { ok: false, error: "email required" };
  // Lightweight email shape check; the portal already validated.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) {
    return { ok: false, error: "email malformed" };
  }
  if (o.candidateType !== "EMPLOYEE" && o.candidateType !== "INTERN") {
    return { ok: false, error: "candidateType must be EMPLOYEE or INTERN" };
  }

  let requiredStages: StageType[] | null = null;
  if (o.requiredStages != null) {
    if (!Array.isArray(o.requiredStages)) {
      return { ok: false, error: "requiredStages must be an array or null" };
    }
    for (const s of o.requiredStages) {
      if (typeof s !== "string" || !VALID_STAGE_TYPES.has(s)) {
        return { ok: false, error: `requiredStages contains invalid value: ${String(s)}` };
      }
    }
    requiredStages = o.requiredStages as StageType[];
  }

  // Optional fields — accept string | null | undefined; normalize.
  const optStr = (v: unknown): string | null =>
    v == null ? null : typeof v === "string" ? v : null;

  return {
    ok: true,
    data: {
      candidateRef: { kind: ref.kind, id: ref.id, code: refCode },
      fullName: o.fullName,
      email: o.email,
      phone: optStr(o.phone),
      positionTitle: optStr(o.positionTitle),
      hiringManager: optStr(o.hiringManager),
      candidateType: o.candidateType,
      startDate: optStr(o.startDate),
      requiredStages,
    },
  };
}

// ───────────────────────────── HMAC helpers ────────────────────────────────

function verifySignature(secret: string, body: string, headerValue: string | null): boolean {
  if (!headerValue) return false;
  // Header format: "sha256=<hex>"
  const eq = headerValue.indexOf("=");
  if (eq < 0) return false;
  const algo = headerValue.slice(0, eq);
  const got = headerValue.slice(eq + 1).trim().toLowerCase();
  if (algo !== "sha256") return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// ─────────────────────────── Domain helpers ────────────────────────────────

function splitName(fullName: string): { first: string; middle: string | null; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Candidate", middle: null, last: "" };
  if (parts.length === 1) return { first: parts[0]!, middle: null, last: "" };
  if (parts.length === 2) return { first: parts[0]!, middle: null, last: parts[1]! };
  return {
    first: parts[0]!,
    middle: parts.slice(1, -1).join(" "),
    last: parts[parts.length - 1]!,
  };
}

function mapCandidateType(t: PortalCandidateType): CandidateType {
  // Portal sends EMPLOYEE | INTERN; Launchpad's enum is INTERN | CANDIDATE | TRAINER | CONTRACTOR.
  return t === "INTERN" ? CandidateType.INTERN : CandidateType.CANDIDATE;
}

// ─────────────────────────────── Handler ───────────────────────────────────

export async function POST(req: NextRequest) {
  const deliveryId = req.headers.get("x-portal-delivery-id") ?? randomUUID();

  // 1. Read raw body BEFORE parsing — HMAC must cover the bytes the portal signed.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (e) {
    logger.error("portal_webhook.read_body_failed", { deliveryId, error: String(e) });
    return NextResponse.json({ ok: false, error: "could not read body" }, { status: 400 });
  }

  // 2. Validate HMAC secret is configured (500 if missing — config error, not client).
  if (!env.PORTAL_WEBHOOK_SECRET) {
    logger.error("portal_webhook.no_secret", { deliveryId });
    return NextResponse.json(
      { ok: false, error: "server misconfigured: PORTAL_WEBHOOK_SECRET missing" },
      { status: 500 },
    );
  }

  // 3. Verify signature.
  const signature = req.headers.get("x-portal-signature");
  if (!verifySignature(env.PORTAL_WEBHOOK_SECRET, rawBody, signature)) {
    logger.warn("portal_webhook.bad_signature", { deliveryId });
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  // 4. Parse + validate.
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const validation = validatePayload(parsed);
  if (!validation.ok) {
    logger.warn("portal_webhook.invalid_payload", { deliveryId, error: validation.error });
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  const data = validation.data;

  logger.info("portal_webhook.received", {
    deliveryId,
    candidateRef: data.candidateRef,
    email: data.email,
  });

  // 5. Idempotency: dedup on (kind, id).
  const existing = await db.case.findFirst({
    where: {
      portalCandidateKind: data.candidateRef.kind,
      portalCandidateId: data.candidateRef.id,
    },
    select: { id: true, reference: true, candidate: { select: { user: true } } },
  });

  if (existing) {
    // Idempotency for retried/duplicate webhook deliveries: ONLY rotate the
    // temp password + re-send the invite while the candidate still has unused
    // temp credentials (mustChangePassword === true). Once they've signed in
    // and set their own password, a redelivery must NOT mint a fresh temp
    // password email (which would invalidate their working password and spam
    // them). We still always return action:"existing".
    const reCandidateEmail = existing.candidate.user.email;
    if (existing.candidate.user.mustChangePassword) {
      const reTempPassword = randomBytes(9).toString("base64url");
      const reHash = await hash(reTempPassword);
      await db.user.update({
        where: { email: reCandidateEmail },
        data: { passwordHash: reHash, mustChangePassword: true },
      });
      const magicLink = await issueMagicLink(reCandidateEmail);
      await sendInviteEmail({
        to: reCandidateEmail,
        name: data.fullName,
        candidateCode: data.candidateRef.code,
        caseReference: existing.reference,
        tempPassword: reTempPassword,
        magicLink,
        caseId: existing.id,
      });
      logger.info("portal_webhook.existing", {
        deliveryId,
        caseId: existing.id,
        reference: existing.reference,
      });
      return NextResponse.json({
        ok: true,
        caseId: existing.id,
        reference: existing.reference,
        magicLink,
        action: "existing",
      });
    }
    logger.info("portal_webhook.existing.no_resend", {
      deliveryId,
      caseId: existing.id,
      reference: existing.reference,
    });
    return NextResponse.json({
      ok: true,
      caseId: existing.id,
      reference: existing.reference,
      action: "existing",
    });
  }

  // 6. Create User (upsert by email — candidate may already exist for other reasons).
  //    Generate a fresh strong temporary password (12 chars base64url ≈ 72 bits).
  //    We only ever hold the plaintext in this request scope — it's bcrypt/argon2-
  //    hashed for storage, surfaced ONCE in the invite email, then dropped on the
  //    floor. We never log it, and `mustChangePassword=true` forces the candidate
  //    to rotate it on first sign-in (see /me/change-password).
  const emailLower = data.email.toLowerCase();
  const tempPassword = randomBytes(9).toString("base64url"); // 12 chars
  const passwordHash = await hash(tempPassword);
  const name = splitName(data.fullName);

  // Capture the prior credential state BEFORE the upsert overwrites it. A user
  // who has already activated (mustChangePassword === false) must NOT have a
  // fresh temp password minted on a retried/duplicate webhook delivery.
  const priorUser = await db.user.findUnique({
    where: { email: emailLower },
    select: { mustChangePassword: true },
  });
  const rotateCredentials = !priorUser || priorUser.mustChangePassword;

  const user = await db.user.upsert({
    where: { email: emailLower },
    // If the user already existed (re-invite, manual case → portal handoff)
    // AND still has unused temp credentials, reset the password to the new
    // temp one so the candidate can always log in using the credentials in the
    // email they just received. If they've already activated, leave their
    // chosen password untouched so a redelivery doesn't lock them out / spam.
    update: rotateCredentials
      ? { name: data.fullName, passwordHash, mustChangePassword: true }
      : { name: data.fullName },
    create: {
      email: emailLower,
      name: data.fullName,
      passwordHash,
      mustChangePassword: true,
      role: Role.CANDIDATE,
      emailVerified: new Date(),
    },
  });

  // 7. Create / refresh Candidate.
  const candidateData: Prisma.CandidateUncheckedCreateInput = {
    userId: user.id,
    candidateType: mapCandidateType(data.candidateType),
    phone: data.phone ?? null,
    legalFirstName: name.first,
    legalMiddleName: name.middle,
    legalLastName: name.last,
    positionTitle: data.positionTitle ?? null,
    hiringManager: data.hiringManager ?? null,
    startDate: data.startDate ? new Date(data.startDate) : null,
  };
  const candidate = await db.candidate.upsert({
    where: { userId: user.id },
    update: {
      candidateType: candidateData.candidateType,
      phone: candidateData.phone,
      legalFirstName: candidateData.legalFirstName,
      legalMiddleName: candidateData.legalMiddleName,
      legalLastName: candidateData.legalLastName,
      positionTitle: candidateData.positionTitle,
      hiringManager: candidateData.hiringManager,
      startDate: candidateData.startDate,
    },
    create: candidateData,
  });

  // If a Case already exists for this candidate (e.g. manually created
  // earlier), backfill the portal link and return it — preserves idempotency
  // across "manual then portal" sequences.
  const candidateExistingCase = await db.case.findUnique({
    where: { candidateId: candidate.id },
    select: { id: true, reference: true, portalCandidateKind: true, portalCandidateId: true },
  });
  if (candidateExistingCase) {
    if (!candidateExistingCase.portalCandidateKind) {
      await db.case.update({
        where: { id: candidateExistingCase.id },
        data: {
          portalCandidateKind: data.candidateRef.kind,
          portalCandidateId: data.candidateRef.id,
        },
      });
    }
    // Only re-send the invite (with the freshly-rotated temp password) while
    // the candidate still has unused temp credentials. Once they've activated,
    // a redelivery just backfills the portal link and returns the existing
    // case without minting/emailing a new temp password.
    if (rotateCredentials) {
      const magicLink = await issueMagicLink(user.email);
      await sendInviteEmail({
        to: user.email,
        name: data.fullName,
        candidateCode: data.candidateRef.code,
        caseReference: candidateExistingCase.reference,
        tempPassword,
        magicLink,
        caseId: candidateExistingCase.id,
      });
      await audit({
        caseId: candidateExistingCase.id,
        action: "portal_webhook.linked",
        metadata: { deliveryId, candidateRef: data.candidateRef },
      });
      return NextResponse.json({
        ok: true,
        caseId: candidateExistingCase.id,
        reference: candidateExistingCase.reference,
        magicLink,
        action: "existing",
      });
    }
    await audit({
      caseId: candidateExistingCase.id,
      action: "portal_webhook.linked",
      metadata: { deliveryId, candidateRef: data.candidateRef, resend: false },
    });
    return NextResponse.json({
      ok: true,
      caseId: candidateExistingCase.id,
      reference: candidateExistingCase.reference,
      action: "existing",
    });
  }

  // 8. Create the Case + Stages.
  // Honor an explicit list from the portal; otherwise derive the set from the
  // candidate type (interns drop EMPLOYMENT) so launchpad is the source of truth.
  const stages =
    data.requiredStages && data.requiredStages.length > 0
      ? data.requiredStages
      : stagesForCandidateType(mapCandidateType(data.candidateType));
  let kase;
  try {
    // Reference collisions (legacy count()-based refs, deletions, concurrent
    // creates) are bumped + retried inside the helper instead of 500'ing
    // (this is the bug that broke recreate + handoff).
    kase = await withUniqueCaseReference((reference) =>
      db.case.create({
        data: {
          reference,
          candidateId: candidate.id,
          requiredStages: stages,
          portalCandidateKind: data.candidateRef.kind,
          portalCandidateId: data.candidateRef.id,
        },
      }),
    );
  } catch (e) {
    // Genuine redelivered/concurrent webhook for the SAME candidate: the @@unique on
    // (portalCandidateKind, portalCandidateId) or candidateId rejects the dup — resolve to
    // the already-created case instead of erroring.
    if (isUniqueViolation(e)) {
      const raced = await db.case.findFirst({
        where: {
          OR: [
            {
              portalCandidateKind: data.candidateRef.kind,
              portalCandidateId: data.candidateRef.id,
            },
            { candidateId: candidate.id },
          ],
        },
        select: { id: true, reference: true },
      });
      if (raced) {
        const magicLink = await issueMagicLink(user.email);
        logger.info("portal_webhook.create_race_resolved", {
          deliveryId,
          caseId: raced.id,
          reference: raced.reference,
        });
        return NextResponse.json({
          ok: true,
          caseId: raced.id,
          reference: raced.reference,
          magicLink,
          action: "existing",
        });
      }
    }
    throw e;
  }

  for (const t of stages) {
    await db.stage.upsert({
      where: { caseId_type: { caseId: kase.id, type: t } },
      update: {},
      create: { caseId: kase.id, type: t },
    });
  }

  // Alert the BGV desk that the portal pushed a new candidate to verification.
  await notifyBgvTeam(kase.id, {
    kind: "CASE_CREATED",
    title: `New candidate — ${kase.reference}`,
    body: `${data.fullName} was moved to BGV from the hiring portal. Their case is now open.`,
    link: `/work/case/${kase.id}`,
  });

  // 9. Magic link (kept as a fallback) + invite email.
  //    The email surfaces the temp password + login URL as the PRIMARY login
  //    path — magic link is a backup so we don't lock the candidate out if
  //    they paste the password wrong.
  const magicLink = await issueMagicLink(user.email);
  await sendInviteEmail({
    to: user.email,
    name: data.fullName,
    candidateCode: data.candidateRef.code,
    caseReference: kase.reference,
    tempPassword,
    magicLink,
    caseId: kase.id,
  });

  await audit({
    caseId: kase.id,
    action: "portal_webhook.case_created",
    metadata: {
      deliveryId,
      candidateRef: data.candidateRef,
      reference: kase.reference,
    },
  });

  logger.info("portal_webhook.created", {
    deliveryId,
    caseId: kase.id,
    reference: kase.reference,
  });

  return NextResponse.json({
    ok: true,
    caseId: kase.id,
    reference: kase.reference,
    magicLink,
    action: "created",
  });
}

// ─────────────────────────── Helpers (private) ─────────────────────────────

/**
 * Issue a magic-link for the given candidate email. Reuses the existing
 * VerificationToken table + /api/auth-link redeem endpoint (see
 * src/app/api/auth-link/route.ts and src/server/actions/auth.ts).
 */
async function issueMagicLink(email: string): Promise<string> {
  const token = randomToken(32);
  await db.verificationToken.create({
    data: {
      identifier: email.toLowerCase(),
      token,
      // BGV onboarding link — longer-lived than the 30-min password reset link.
      expires: new Date(Date.now() + 14 * 86_400_000),
    },
  });
  return `${env.APP_URL}/api/auth-link?token=${token}`;
}

async function sendInviteEmail(opts: {
  to: string;
  name: string;
  candidateCode: string;
  caseReference: string;
  tempPassword: string;
  magicLink: string;
  caseId: string;
}) {
  // NOTE on logging: opts.tempPassword is intentionally NEVER passed to logger
  // or audit metadata. It's surfaced ONLY in the email body (which is then
  // persisted in EmailLog.bodyHtml — see lib/mailer.ts; treat that column as
  // PII).
  const html = tpl.candidateBgvInvite({
    name: opts.name,
    candidateCode: opts.candidateCode,
    caseReference: opts.caseReference,
    email: opts.to,
    tempPassword: opts.tempPassword,
    loginUrl: `${env.APP_URL}/login`,
    magicLink: opts.magicLink,
  });
  try {
    await sendMail({
      to: opts.to,
      subject: `Complete your background verification — ${opts.caseReference} (Candidate ${opts.candidateCode})`,
      html,
      templateId: "portal.bgv.invite",
      caseId: opts.caseId,
    });
  } catch (e) {
    logger.error("portal_webhook.invite_email_failed", {
      caseId: opts.caseId,
      to: opts.to,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

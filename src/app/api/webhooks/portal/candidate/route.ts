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
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
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
const DEFAULT_STAGES: StageType[] = [
  StageType.IDENTITY,
  StageType.ADDRESS,
  StageType.EDUCATION,
  StageType.EMPLOYMENT,
  StageType.CRIMINAL,
];

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
  if (!isNonEmptyString(ref.code)) return { ok: false, error: "candidateRef.code required" };

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
      candidateRef: { kind: ref.kind, id: ref.id, code: ref.code },
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

async function generateReference(): Promise<string> {
  // Matches existing pattern (createCase action): LP-YYYY-NNNN.
  const year = new Date().getFullYear();
  const count = await db.case.count();
  // Add a tiny random suffix tail if collision arises (defensive).
  const padded = String(count + 1).padStart(4, "0");
  return `LP-${year}-${padded}`;
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
    // Issue a fresh magic-link so the portal can hand back a working invite,
    // but do NOT recreate anything.
    const magicLink = await issueMagicLink(existing.candidate.user.email);
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

  // 6. Create User (upsert by email — candidate may already exist for other reasons).
  const emailLower = data.email.toLowerCase();
  const tempPassword = randomToken(8);
  const passwordHash = await hash(tempPassword);
  const name = splitName(data.fullName);

  const user = await db.user.upsert({
    where: { email: emailLower },
    update: { name: data.fullName },
    create: {
      email: emailLower,
      name: data.fullName,
      passwordHash,
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
    const magicLink = await issueMagicLink(user.email);
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

  // 8. Create the Case + Stages.
  const stages =
    data.requiredStages && data.requiredStages.length > 0
      ? data.requiredStages
      : DEFAULT_STAGES;
  const reference = await generateReference();

  const kase = await db.case.create({
    data: {
      reference,
      candidateId: candidate.id,
      requiredStages: stages,
      portalCandidateKind: data.candidateRef.kind,
      portalCandidateId: data.candidateRef.id,
    },
  });

  for (const t of stages) {
    await db.stage.upsert({
      where: { caseId_type: { caseId: kase.id, type: t } },
      update: {},
      create: { caseId: kase.id, type: t },
    });
  }

  // 9. Magic link + invite email.
  const magicLink = await issueMagicLink(user.email);
  await sendInviteEmail({
    to: user.email,
    name: data.fullName,
    reference: kase.reference,
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
  reference: string;
  magicLink: string;
  caseId: string;
}) {
  // Reuse the standard email envelope (tpl.magicLink wraps in Launch Pad branding)
  // but customize the body for BGV onboarding.
  const body = `<p>Hi ${opts.name},</p>
       <p>The hiring team at ElvixIT has asked us to start your background verification on <b>Launch Pad</b>.</p>
       <p><b>Case reference:</b> ${opts.reference}</p>
       <p>Click the secure link below to sign in and begin. The link is valid for 14 days; you can request a new one from the sign-in page if it expires.</p>
       <p><a href="${opts.magicLink}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Start my background verification</a></p>
       <p style="color:#64748b;font-size:12px">If you didn't expect this email, please contact ${env.APP_SUPPORT_EMAIL}.</p>`;

  // tpl.magicLink doesn't take a reference, so build directly via the same
  // wrapper style. We pass through sendMail so it gets logged in EmailLog.
  const html = wrapBrandedEmail(`Start your background verification — ${opts.reference}`, body);
  try {
    await sendMail({
      to: opts.to,
      subject: "Complete your background verification — ElvixIT",
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

function wrapBrandedEmail(title: string, body: string): string {
  // Inline the same envelope used by lib/email-templates.ts so the look matches.
  // Kept here (rather than exported from email-templates) to avoid widening
  // that file's public surface for one consumer.
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:32px 0;margin:0">
  <table align="center" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e2e8f0">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:28px;height:28px;background:#6366f1;border-radius:6px"></span>
        <strong style="font-size:14px">Launch Pad</strong>
        <span style="margin-left:auto;font-size:11px;color:#64748b;letter-spacing:.08em;text-transform:uppercase">ElvixIT · BGV</span>
      </div>
    </td></tr>
    <tr><td style="padding:24px 28px;font-size:14px;line-height:1.6;color:#0f172a">${body}</td></tr>
    <tr><td style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0">
      You're receiving this because the hiring team initiated a background check for you. Questions? Contact ${env.APP_SUPPORT_EMAIL}.
    </td></tr>
  </table>
</body></html>`;
}

// Inbound webhook: portal → launchpad physical-verification trigger.
//
// When HR opens a candidate resource in the company portal and chooses "Start
// physical verification", the portal POSTs here. We:
//   1. Verify the HMAC signature (X-Portal-Signature) against PORTAL_WEBHOOK_SECRET
//      — the SAME shared secret as the candidate-provisioning webhook.
//   2. Resolve the target case by caseReference, or by the portal candidate
//      ref (kind + id) used at provisioning time.
//   3. Idempotently start the optional physical-verification service (origin
//      PORTAL), seeding field visits from the candidate's declared data.
//   4. Alert the BGV field desk and reply with { caseId, reference, status }.
//
// This service is NEVER required for clearance — triggering it only opens the
// background field-verification workflow; it does not gate or change the case.

import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { notifyBgvTeam } from "@/server/notify";
import { ensurePhysicalVerification } from "@/server/physical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySignature(secret: string, body: string, headerValue: string | null): boolean {
  if (!headerValue) return false;
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

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  const deliveryId = req.headers.get("x-portal-delivery-id") ?? randomUUID();

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (e) {
    logger.error("physical_webhook.read_body_failed", { deliveryId, error: String(e) });
    return NextResponse.json({ ok: false, error: "could not read body" }, { status: 400 });
  }

  if (!env.PORTAL_WEBHOOK_SECRET) {
    logger.error("physical_webhook.no_secret", { deliveryId });
    return NextResponse.json(
      { ok: false, error: "server misconfigured: PORTAL_WEBHOOK_SECRET missing" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("x-portal-signature");
  if (!verifySignature(env.PORTAL_WEBHOOK_SECRET, rawBody, signature)) {
    logger.warn("physical_webhook.bad_signature", { deliveryId });
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const o = (parsed ?? {}) as Record<string, unknown>;

  // Resolve the case: prefer caseReference, fall back to the portal candidate ref.
  let kase: { id: string; reference: string } | null = null;
  if (isNonEmptyString(o.caseReference)) {
    kase = await db.case.findUnique({
      where: { reference: o.caseReference.trim() },
      select: { id: true, reference: true },
    });
  }
  if (!kase) {
    const ref = o.candidateRef as Record<string, unknown> | undefined;
    if (ref && (ref.kind === "JOB" || ref.kind === "INTERNSHIP") && isNonEmptyString(ref.id)) {
      kase = await db.case.findFirst({
        where: { portalCandidateKind: ref.kind, portalCandidateId: ref.id.trim() },
        select: { id: true, reference: true },
      });
    }
  }
  if (!kase) {
    logger.warn("physical_webhook.case_not_found", { deliveryId });
    return NextResponse.json(
      { ok: false, error: "no matching case for caseReference / candidateRef" },
      { status: 404 },
    );
  }

  const reason = isNonEmptyString(o.reason) ? o.reason.trim().slice(0, 2000) : null;

  try {
    const result = await ensurePhysicalVerification(kase.id, { origin: "PORTAL", reason });

    if (result.created) {
      await audit({
        caseId: kase.id,
        action: "physical.started",
        metadata: { origin: "PORTAL", deliveryId, seededVisits: result.seededVisits },
      });
      await notifyBgvTeam(kase.id, {
        kind: "GENERIC",
        title: `Field verification requested — ${kase.reference}`,
        body: `The hiring portal requested on-ground verification (${result.seededVisits} site(s) to visit).`,
        link: `/work/case/${kase.id}/physical`,
      });
    }

    logger.info("physical_webhook.ok", {
      deliveryId,
      caseId: kase.id,
      reference: kase.reference,
      created: result.created,
    });
    return NextResponse.json({
      ok: true,
      caseId: kase.id,
      reference: kase.reference,
      status: result.verification.status,
      action: result.created ? "started" : "existing",
    });
  } catch (e) {
    logger.error("physical_webhook.failed", {
      deliveryId,
      caseId: kase.id,
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false, error: "could not start physical verification" }, { status: 500 });
  }
}

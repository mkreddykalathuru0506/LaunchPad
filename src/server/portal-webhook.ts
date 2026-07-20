// Outbound BGV → company-portal webhook.
//
// Fires when a Case transitions to a terminal status (CLEARED / REJECTED /
// WITHDRAWN), but ONLY when the case was originally created via the portal
// (portalCandidateKind + portalCandidateId set).
//
// Fire-and-forget by design: any failure logs but never throws into the
// transition path. We retry up to 3 times with 1s/4s/16s backoff before
// giving up — no job queue, just setTimeout chains scheduled via
// setImmediate so the calling action returns immediately.

import { createHmac, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { buildCandidateProfile } from "@/server/portal-profile";

type PortalEvent = "bgv.cleared" | "bgv.rejected" | "bgv.withdrawn";

const STATUS_TO_EVENT: Record<string, PortalEvent> = {
  CLEARED: "bgv.cleared",
  REJECTED: "bgv.rejected",
  WITHDRAWN: "bgv.withdrawn",
};

const RETRY_DELAYS_MS = [1_000, 4_000, 16_000];

function hmacSignature(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

async function postOnce(
  url: string,
  body: string,
  signature: string,
  deliveryId: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Launchpad-Signature": signature,
        "X-Launchpad-Delivery-Id": deliveryId,
        "User-Agent": "Launchpad-BGV-Webhook/1.0",
      },
      body,
      // Don't hang forever if the portal is down.
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function deliverWithRetries(
  url: string,
  body: string,
  signature: string,
  deliveryId: string,
  caseId: string,
  event: PortalEvent,
): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1]!;
      await new Promise((r) => setTimeout(r, delay));
    }
    const result = await postOnce(url, body, signature, deliveryId);
    if (result.ok) {
      logger.info("portal_webhook.delivered", {
        deliveryId,
        caseId,
        event,
        attempt,
        status: result.status,
      });
      // Best-effort audit (never throw).
      try {
        await audit({
          caseId,
          action: "portal_webhook.delivered",
          metadata: { deliveryId, event, attempt, status: result.status },
        });
      } catch {}
      return;
    }
    logger.warn("portal_webhook.attempt_failed", {
      deliveryId,
      caseId,
      event,
      attempt,
      status: result.status,
      error: result.error,
    });
  }
  logger.error("portal_webhook.gave_up", { deliveryId, caseId, event });
  try {
    await audit({
      caseId,
      action: "portal_webhook.failed",
      metadata: { deliveryId, event },
    });
  } catch {}
}

/**
 * Notify the portal that a case has reached a terminal status. No-op if the
 * case wasn't created by the portal, the env switch is off, or no secret is
 * configured. Never throws.
 */
export async function notifyPortalCaseStatus(
  caseId: string,
  newStatus: "CLEARED" | "REJECTED" | "WITHDRAWN",
): Promise<void> {
  try {
    if (env.BGV_WEBHOOK_ENABLED !== "true") return;
    if (!env.PORTAL_WEBHOOK_SECRET) {
      logger.warn("portal_webhook.no_secret", { caseId });
      return;
    }
    const event = STATUS_TO_EVENT[newStatus];
    if (!event) return;

    const kase = await db.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        reference: true,
        portalCandidateKind: true,
        portalCandidateId: true,
        clearedAt: true,
        rejectedAt: true,
        clearedReportPath: true,
        updatedAt: true,
        candidate: {
          select: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });
    if (!kase) {
      logger.warn("portal_webhook.case_missing", { caseId });
      return;
    }
    // Only fire for cases actually linked to the portal.
    if (!kase.portalCandidateKind || !kase.portalCandidateId) return;

    const completedAt =
      (newStatus === "CLEARED" ? kase.clearedAt : null) ??
      (newStatus === "REJECTED" ? kase.rejectedAt : null) ??
      kase.updatedAt ??
      new Date();

    const reportUrl =
      newStatus === "CLEARED" && kase.clearedReportPath
        ? `${env.APP_URL}/api/documents/cleared-report/${kase.id}`
        : null;

    // On clearance, carry the profile the candidate filled in here. The portal
    // stores it on the candidate row and copies it onto the employee's profile at
    // provisioning (gaps only) — see portal docs/integrations/candidate-profile-contract.md.
    // Rejected/withdrawn cases send nothing: there's no hire to populate.
    let verifiedProfile = null;
    if (newStatus === "CLEARED") {
      try {
        verifiedProfile = await buildCandidateProfile(kase.id);
      } catch (e) {
        // A profile we can't build must not cost the portal its status callback.
        logger.warn("portal_webhook.profile_build_failed", {
          caseId: kase.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      caseReference: kase.reference,
      candidateRef: {
        kind: kase.portalCandidateKind,
        // The portal-side candidate uuid (NOT the launchpad case id).
        id: kase.portalCandidateId,
        // The portal's human code lives in portalCandidateId metadata too —
        // we only persist the id, so re-emit it here as well for symmetry.
        // The portal looks up by id, so code is informational.
        code: kase.portalCandidateId,
      },
      completedAt: completedAt.toISOString(),
      reportUrl,
      // Optional by contract — the portal ignores it when absent.
      ...(verifiedProfile ? { verifiedProfile } : {}),
    };

    const body = JSON.stringify(payload);
    const signature = hmacSignature(env.PORTAL_WEBHOOK_SECRET, body);
    const deliveryId = randomUUID();

    // Fire-and-forget. Schedule on next tick so the caller's response is not
    // held up by the network round-trip.
    setImmediate(() => {
      void deliverWithRetries(
        env.PORTAL_BGV_CALLBACK_URL,
        body,
        signature,
        deliveryId,
        kase.id,
        event,
      );
    });

    logger.info("portal_webhook.scheduled", {
      deliveryId,
      caseId: kase.id,
      event,
    });
  } catch (e) {
    // Never let webhook logic break the transition that produced it.
    logger.error("portal_webhook.unexpected", {
      caseId,
      newStatus,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { randomToken } from "@/lib/crypto";
import { CaseStatus, Role, StageStatus, StageType } from "@prisma/client";
import { generateClearedReport } from "@/server/pdf/cleared-report";
import {
  emailCandidateCleared, emailCandidateRejected, emailStageCorrection,
  emailStageDecided, emailCandidateAssigned, emailVerifierAssigned,
} from "@/server/emails";
import { notifyPortalCaseStatus } from "@/server/portal-webhook";

const decisionSchema = z.object({
  stageId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "NEEDS_CORRECTION"]),
  comment: z.string().max(2000).optional(),
});

async function recomputeCase(caseId: string) {
  const stages = await db.stage.findMany({ where: { caseId } });
  const required = stages.length;
  const approved = stages.filter((s) => s.status === "APPROVED").length;
  const anySubmitted = stages.some((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW");
  const anyCorrection = stages.some((s) => s.status === "NEEDS_CORRECTION");
  const anyRejected = stages.some((s) => s.status === "REJECTED");

  let status: "DRAFT" | "IN_PROGRESS" | "AWAITING_REVIEW" | "NEEDS_CORRECTION" | "CLEARED" | "REJECTED" = "IN_PROGRESS";
  if (approved === required && required > 0) status = "CLEARED";
  else if (anyRejected) status = "REJECTED";
  else if (anyCorrection) status = "NEEDS_CORRECTION";
  else if (anySubmitted) status = "AWAITING_REVIEW";

  await db.case.update({
    where: { id: caseId },
    data: {
      status,
      clearedAt: status === "CLEARED" ? new Date() : null,
      rejectedAt: status === "REJECTED" ? new Date() : null,
    },
  });

  // Fire portal callback on terminal transitions. Fire-and-forget; never throws.
  if (status === "CLEARED" || status === "REJECTED") {
    void notifyPortalCaseStatus(caseId, status);
  }

  return status;
}

export async function decideStage(formData: FormData) {
  const session = await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  const parsed = decisionSchema.parse({
    stageId: formData.get("stageId"),
    decision: formData.get("decision"),
    comment: formData.get("comment")?.toString() || undefined,
  });

  const stage = await db.stage.findUnique({ where: { id: parsed.stageId }, include: { case: { include: { candidate: { include: { user: true } } } } } });
  if (!stage) throw new Error("Stage not found");

  // State guard: refuse to decide a stage on an already-finalized case. Without
  // this, a stale tab / double-submit could re-approve or re-reject a CLEARED /
  // REJECTED / WITHDRAWN case and re-fire the terminal portal webhook.
  const OPEN_STATUSES: CaseStatus[] = [
    CaseStatus.DRAFT,
    CaseStatus.IN_PROGRESS,
    CaseStatus.AWAITING_REVIEW,
    CaseStatus.NEEDS_CORRECTION,
  ];
  if (!OPEN_STATUSES.includes(stage.case.status)) {
    throw new Error("Case is already finalized");
  }

  // Ownership guard: a VERIFIER may only decide a case assigned to them.
  // MANAGER / ADMIN are exempt (they can act on any case). If the case has no
  // assigned verifier yet, any VERIFIER may pick it up.
  if (
    session.user.role === Role.VERIFIER &&
    stage.case.assignedVerifierId &&
    stage.case.assignedVerifierId !== session.user.id
  ) {
    throw new Error("You are not assigned to this case");
  }

  await db.$transaction(async (tx) => {
    await tx.stage.update({
      where: { id: stage.id },
      data: { status: parsed.decision as StageStatus, decidedAt: new Date() },
    });
    await tx.stageReview.create({
      data: {
        stageId: stage.id,
        reviewerId: session.user.id,
        decision: parsed.decision as StageStatus,
        comment: parsed.comment ?? null,
      },
    });
  });

  await audit({
    actorId: session.user.id,
    caseId: stage.caseId,
    action: `stage.${parsed.decision.toLowerCase()}`,
    target: stage.type,
    metadata: { stageId: stage.id, comment: parsed.comment ?? null },
  });

  const newStatus = await recomputeCase(stage.caseId);

  // Notifications
  const candEmail = stage.case.candidate.user.email;
  const candName = stage.case.candidate.user.name ?? candEmail;
  const link = `${env.APP_URL}/me/stage/${stage.type.toLowerCase()}`;

  if (parsed.decision === "NEEDS_CORRECTION") {
    const token = randomToken(32);
    await db.magicLink.create({
      data: {
        token, caseId: stage.caseId, stageType: stage.type, purpose: "RESUBMIT",
        expiresAt: new Date(Date.now() + 7 * 86400_000),
      },
    });
    await emailStageCorrection({
      to: candEmail,
      name: candName,
      reference: stage.case.reference,
      stage: stage.type,
      comment: parsed.comment ?? "Please review the stage and resubmit.",
      redeemUrl: `${env.APP_URL}/redeem/${token}`,
      caseId: stage.caseId,
    });
    await db.notification.create({
      data: {
        userId: stage.case.candidate.userId,
        kind: "CORRECTION_REQUESTED",
        title: `Correction needed: ${stage.type}`,
        body: parsed.comment ?? "Open the stage to see details.",
        link: `/me/stage/${stage.type.toLowerCase()}`,
      },
    });
  } else {
    await emailStageDecided({
      to: candEmail,
      name: candName,
      reference: stage.case.reference,
      stage: stage.type,
      decision: parsed.decision as "APPROVED" | "REJECTED",
      comment: parsed.comment,
      caseId: stage.caseId,
    });
  }

  if (newStatus === "CLEARED") {
    await issueClearance(stage.caseId, session.user.id);
  }
  if (newStatus === "REJECTED") {
    await emailCandidateRejected({
      to: candEmail,
      name: candName,
      reference: stage.case.reference,
      reason: parsed.comment,
      caseId: stage.caseId,
    });
    await audit({ actorId: session.user.id, caseId: stage.caseId, action: "case.rejected" });
  }

  revalidatePath(`/work/case/${stage.caseId}`);
  revalidatePath("/work");
}

export async function reassignCase(formData: FormData) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const caseId = formData.get("caseId")?.toString();
  const verifierId = formData.get("verifierId")?.toString();
  if (!caseId || !verifierId) throw new Error("Invalid input");
  await db.case.update({ where: { id: caseId }, data: { assignedVerifierId: verifierId } });
  await audit({ actorId: session.user.id, caseId, action: "case.reassigned", metadata: { verifierId } });

  // Email both the new verifier and the candidate
  const kase = await db.case.findUnique({
    where: { id: caseId },
    include: { candidate: { include: { user: true } }, assignedVerifier: true },
  });
  if (kase?.assignedVerifier) {
    await emailVerifierAssigned({ caseId, verifierId });
    await emailCandidateAssigned({
      to: kase.candidate.user.email,
      name: kase.candidate.user.name ?? kase.candidate.user.email,
      reference: kase.reference,
      verifierName: kase.assignedVerifier.name ?? "your verifier",
      caseId,
    });
  }

  revalidatePath(`/work/case/${caseId}`);
}

export async function addCaseNote(formData: FormData) {
  const session = await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  const caseId = formData.get("caseId")?.toString();
  const body = formData.get("body")?.toString();
  if (!caseId || !body) return;
  await db.caseNote.create({ data: { caseId, authorId: session.user.id, body } });
  await audit({ actorId: session.user.id, caseId, action: "case.note.added" });
  revalidatePath(`/work/case/${caseId}`);
}

export async function issueClearance(caseId: string, actorId: string) {
  // Idempotency guard: if the case is already CLEARED, skip the report
  // regeneration, the clearance emails, and (most importantly) the outbound
  // portal webhook so a re-run does not re-fire bgv.cleared.
  const existing = await db.case.findUnique({
    where: { id: caseId },
    select: { status: true },
  });
  if (existing?.status === CaseStatus.CLEARED) return;

  const path = await generateClearedReport(caseId);
  await db.case.update({ where: { id: caseId }, data: { clearedReportPath: path, status: "CLEARED", clearedAt: new Date() } });
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { candidate: { include: { user: true } }, managedBy: true },
  });
  if (c) {
    await emailCandidateCleared({
      to: c.candidate.user.email,
      name: c.candidate.user.name ?? c.candidate.user.email,
      reference: c.reference,
      caseId,
    });
    if (c.managedBy?.email && c.managedBy.email !== c.candidate.user.email) {
      // FYI to the hiring manager
      await emailCandidateCleared({
        to: c.managedBy.email,
        name: c.managedBy.name ?? "Manager",
        reference: c.reference,
        caseId,
      });
    }
    await audit({ actorId, caseId, action: "case.cleared" });
  }
  // Manual / report-driven clearance also notifies the portal.
  void notifyPortalCaseStatus(caseId, "CLEARED");
}

export async function manuallyClearCase(formData: FormData) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const caseId = formData.get("caseId")?.toString();
  if (!caseId) throw new Error("caseId required");
  await issueClearance(caseId, session.user.id);
  revalidatePath(`/work/case/${caseId}`);
}

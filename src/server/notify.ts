import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requiredStagesForCase } from "@/lib/stages";
import { Role, NotificationKind } from "@prisma/client";

type BgvNotification = {
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
};

/**
 * Notify the BGV team about activity on a case (new candidate, stage submitted,
 * case cleared, …). Recipients are resolved from the case: the assigned verifier
 * + the owning manager. When NO verifier is assigned yet, we fall back to every
 * active ADMIN / MANAGER so a fresh case or submission is never silently parked
 * in an unwatched queue.
 *
 * In-app only (the bell + unread badge). Stage-submission emails to the verifier
 * / bgv@ inbox are unchanged — this adds the missing in-app signal on top.
 *
 * Best-effort by design: NEVER throws. These pings run inside critical paths
 * (webhook provisioning before the invite email, stage submits after the data
 * is persisted) — a transient notification failure must not 500 a webhook or
 * tell a candidate their already-saved submit "failed".
 */
export async function notifyBgvTeam(caseId: string, n: BgvNotification): Promise<void> {
  try {
    const kase = await db.case.findUnique({
      where: { id: caseId },
      select: { assignedVerifierId: true, managedById: true },
    });

    const recipientIds = new Set<string>();
    if (kase?.assignedVerifierId) recipientIds.add(kase.assignedVerifierId);
    if (kase?.managedById) recipientIds.add(kase.managedById);

    if (!kase?.assignedVerifierId) {
      const team = await db.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.MANAGER] }, active: true },
        select: { id: true },
      });
      for (const t of team) recipientIds.add(t.id);
    }

    if (recipientIds.size === 0) return;

    await db.notification.createMany({
      data: [...recipientIds].map((userId) => ({
        userId,
        kind: n.kind,
        title: n.title,
        body: n.body,
        link: n.link ?? null,
      })),
    });
  } catch (e) {
    logger.error("notify.bgv_team_failed", {
      caseId,
      kind: n.kind,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Notify the BGV team that a candidate submitted a stage. Adds a second
 * "all stages submitted" notification when this submission completes the set,
 * so the desk gets an explicit "candidate is done — ready for review" signal.
 *
 * Best-effort like notifyBgvTeam — never throws into the submit path.
 */
export async function notifyStageSubmitted(
  caseId: string,
  opts: { stageLabel: string; candidateName: string; reference: string },
): Promise<void> {
  await notifyBgvTeam(caseId, {
    kind: "STAGE_SUBMITTED",
    title: `${opts.stageLabel} submitted — ${opts.reference}`,
    body: `${opts.candidateName} submitted their ${opts.stageLabel} stage.`,
    link: `/work/case/${caseId}`,
  });

  try {
    // "Done" is judged against the case's REQUIRED set, not every raw stage row —
    // a stray non-required row would otherwise suppress this signal forever.
    const kase = await db.case.findUnique({
      where: { id: caseId },
      select: { requiredStages: true, stages: { select: { type: true, status: true } } },
    });
    if (!kase) return;
    const required = requiredStagesForCase(kase, kase.stages);
    const statusByType = new Map(kase.stages.map((s) => [s.type, s.status]));
    const allSubmitted =
      required.length > 0 &&
      required.every((t) => {
        const st = statusByType.get(t);
        return st === "SUBMITTED" || st === "UNDER_REVIEW" || st === "APPROVED";
      });
    if (allSubmitted) {
      await notifyBgvTeam(caseId, {
        kind: "GENERIC",
        title: `All stages submitted — ${opts.reference}`,
        body: `${opts.candidateName} has completed every BGV stage. The case is ready for review.`,
        link: `/work/case/${caseId}`,
      });
    }
  } catch (e) {
    logger.error("notify.all_submitted_check_failed", {
      caseId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

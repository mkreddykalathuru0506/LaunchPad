import { db } from "@/lib/db";
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
 */
export async function notifyBgvTeam(caseId: string, n: BgvNotification): Promise<void> {
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
}

/**
 * Notify the BGV team that a candidate submitted a stage. Adds a second
 * "all stages submitted" notification when this submission completes the set,
 * so the desk gets an explicit "candidate is done — ready for review" signal.
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

  const stages = await db.stage.findMany({ where: { caseId }, select: { status: true } });
  const allSubmitted =
    stages.length > 0 &&
    stages.every((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW" || s.status === "APPROVED");
  if (allSubmitted) {
    await notifyBgvTeam(caseId, {
      kind: "GENERIC",
      title: `All stages submitted — ${opts.reference}`,
      body: `${opts.candidateName} has completed every BGV stage. The case is ready for review.`,
      link: `/work/case/${caseId}`,
    });
  }
}

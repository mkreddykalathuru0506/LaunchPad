import { db } from "@/lib/db";

export type ActivityRow = {
  id: string;
  action: string;
  target: string | null;
  actorName: string | null;
  caseRef: string | null;
  createdAt: Date;
};

export async function getRecentActivity(opts: {
  caseId?: string;
  limit?: number;
}): Promise<ActivityRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 200);

  const events = await db.auditEvent.findMany({
    where: opts.caseId ? { caseId: opts.caseId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { name: true, email: true } },
    },
  });

  // Batch-fetch case references for any caseIds we have.
  const caseIds = Array.from(
    new Set(events.map((e) => e.caseId).filter((x): x is string => Boolean(x)))
  );
  const caseRefs = caseIds.length
    ? await db.case.findMany({
        where: { id: { in: caseIds } },
        select: { id: true, reference: true },
      })
    : [];
  const caseRefMap = new Map(caseRefs.map((c) => [c.id, c.reference]));

  return events.map((e) => ({
    id: e.id,
    action: e.action,
    target: e.target,
    actorName: e.actor?.name ?? e.actor?.email ?? null,
    caseRef: e.caseId ? caseRefMap.get(e.caseId) ?? null : null,
    createdAt: e.createdAt,
  }));
}

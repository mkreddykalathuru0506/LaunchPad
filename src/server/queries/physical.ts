import { db } from "@/lib/db";

/**
 * The physical-verification record for a case, with its visits (each with
 * on-site photos), the field agent, and who started the service. Returns null
 * when the optional service was never started for this case.
 */
export async function getPhysicalVerificationForCase(caseId: string) {
  return db.physicalVerification.findUnique({
    where: { caseId },
    include: {
      startedBy: { select: { id: true, name: true, email: true } },
      assignedAgent: { select: { id: true, name: true, email: true } },
      visits: {
        orderBy: { createdAt: "asc" },
        include: {
          photos: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
}

/** Just the status + visit counts — cheap enough for the case-page tab badge. */
export async function getPhysicalSummaryForCase(caseId: string) {
  const pv = await db.physicalVerification.findUnique({
    where: { caseId },
    select: {
      status: true,
      _count: { select: { visits: true } },
      visits: { select: { status: true } },
    },
  });
  if (!pv) return null;
  const verified = pv.visits.filter((v) => v.status === "VERIFIED").length;
  return { status: pv.status, total: pv._count.visits, verified };
}

/**
 * The field-team work queue: every physical verification that is still open
 * (not completed / cancelled), newest first, with the case + candidate and a
 * verified/total visit tally for the row.
 */
export async function getPhysicalQueue() {
  const rows = await db.physicalVerification.findMany({
    where: { status: { in: ["REQUESTED", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      case: {
        select: {
          id: true,
          reference: true,
          candidate: { select: { user: { select: { name: true, email: true } } } },
        },
      },
      visits: { select: { status: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    origin: r.origin,
    createdAt: r.createdAt,
    caseId: r.case.id,
    reference: r.case.reference,
    candidateName: r.case.candidate.user.name ?? r.case.candidate.user.email,
    agentName: r.assignedAgent?.name ?? r.assignedAgent?.email ?? null,
    total: r.visits.length,
    verified: r.visits.filter((v) => v.status === "VERIFIED").length,
    open: r.visits.filter((v) => v.status === "PENDING").length,
  }));
}

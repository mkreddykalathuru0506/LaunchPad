import { db } from "@/lib/db";

export async function getCaseForCandidate(userId: string) {
  const candidate = await db.candidate.findUnique({
    where: { userId },
    include: {
      case: {
        include: {
          stages: { orderBy: { type: "asc" } },
          documents: true,
          addresses: true,
          educations: true,
          employments: true,
          references: true,
          veteranRecord: true,
        },
      },
      user: true,
    },
  });
  return candidate;
}

export async function getCaseForVerifier(caseId: string) {
  return db.case.findUnique({
    where: { id: caseId },
    include: {
      candidate: { include: { user: true } },
      assignedVerifier: true,
      managedBy: true,
      stages: { include: { reviews: { include: { reviewer: true }, orderBy: { createdAt: "desc" } } }, orderBy: { type: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      addresses: true,
      educations: true,
      employments: true,
      references: true,
      veteranRecord: true,
      consents: true,
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
}

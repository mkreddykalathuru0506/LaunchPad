import { db } from "@/lib/db";
import { Role, Prisma } from "@prisma/client";

export type SearchResults = {
  cases: Array<{
    id: string;
    reference: string;
    status: string;
    candidateName: string | null;
  }>;
  candidates: Array<{
    id: string;
    name: string;
    positionTitle: string | null;
    caseId: string | null;
    caseReference: string | null;
  }>;
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    role: Role;
  }>;
};

const TAKE = 5;

function joinName(first?: string | null, last?: string | null, fallback?: string | null) {
  const composed = [first, last].filter(Boolean).join(" ").trim();
  return composed.length > 0 ? composed : fallback ?? null;
}

export async function searchEverything(
  q: string,
  role: Role,
  userId: string
): Promise<SearchResults> {
  const term = q.trim();
  const empty: SearchResults = { cases: [], candidates: [], users: [] };
  if (term.length === 0) return empty;

  const contains: Prisma.StringFilter = { contains: term, mode: "insensitive" };

  // ----- ADMIN / MANAGER: everything -----
  if (role === Role.ADMIN || role === Role.MANAGER) {
    const [cases, candidates, users] = await Promise.all([
      db.case.findMany({
        where: { reference: contains },
        take: TAKE,
        orderBy: { updatedAt: "desc" },
        include: { candidate: { include: { user: { select: { name: true } } } } },
      }),
      db.candidate.findMany({
        where: {
          OR: [
            { legalFirstName: contains },
            { legalLastName: contains },
            { positionTitle: contains },
          ],
        },
        take: TAKE,
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { name: true } },
          case: { select: { id: true, reference: true } },
        },
      }),
      db.user.findMany({
        where: { OR: [{ name: contains }, { email: contains }] },
        take: TAKE,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true },
      }),
    ]);

    return {
      cases: cases.map((c) => ({
        id: c.id,
        reference: c.reference,
        status: c.status,
        candidateName: joinName(
          c.candidate.legalFirstName,
          c.candidate.legalLastName,
          c.candidate.user.name
        ),
      })),
      candidates: candidates.map((c) => ({
        id: c.id,
        name:
          joinName(c.legalFirstName, c.legalLastName, c.user.name) ??
          "Unnamed candidate",
        positionTitle: c.positionTitle,
        caseId: c.case?.id ?? null,
        caseReference: c.case?.reference ?? null,
      })),
      users,
    };
  }

  // ----- VERIFIER: only their assigned cases + candidates on those cases -----
  if (role === Role.VERIFIER) {
    const myCases = await db.case.findMany({
      where: {
        assignedVerifierId: userId,
        OR: [
          { reference: contains },
          { candidate: { legalFirstName: contains } },
          { candidate: { legalLastName: contains } },
          { candidate: { positionTitle: contains } },
        ],
      },
      take: TAKE,
      orderBy: { updatedAt: "desc" },
      include: { candidate: { include: { user: { select: { name: true } } } } },
    });

    const myCandidates = await db.candidate.findMany({
      where: {
        case: { assignedVerifierId: userId },
        OR: [
          { legalFirstName: contains },
          { legalLastName: contains },
          { positionTitle: contains },
        ],
      },
      take: TAKE,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true } },
        case: { select: { id: true, reference: true } },
      },
    });

    return {
      cases: myCases.map((c) => ({
        id: c.id,
        reference: c.reference,
        status: c.status,
        candidateName: joinName(
          c.candidate.legalFirstName,
          c.candidate.legalLastName,
          c.candidate.user.name
        ),
      })),
      candidates: myCandidates.map((c) => ({
        id: c.id,
        name:
          joinName(c.legalFirstName, c.legalLastName, c.user.name) ??
          "Unnamed candidate",
        positionTitle: c.positionTitle,
        caseId: c.case?.id ?? null,
        caseReference: c.case?.reference ?? null,
      })),
      users: [],
    };
  }

  // ----- CANDIDATE: own case + own docs by filename -----
  const myCandidate = await db.candidate.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true } },
      case: {
        include: {
          documents: {
            where: { filename: contains },
            take: TAKE,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!myCandidate?.case) return empty;

  const refMatch =
    myCandidate.case.reference.toLowerCase().includes(term.toLowerCase());

  return {
    cases: refMatch
      ? [
          {
            id: myCandidate.case.id,
            reference: myCandidate.case.reference,
            status: myCandidate.case.status,
            candidateName: joinName(
              myCandidate.legalFirstName,
              myCandidate.legalLastName,
              myCandidate.user.name
            ),
          },
        ]
      : [],
    candidates: myCandidate.case.documents.map((d) => ({
      id: d.id,
      name: d.filename,
      positionTitle: d.kind,
      caseId: myCandidate.case!.id,
      caseReference: myCandidate.case!.reference,
    })),
    users: [],
  };
}

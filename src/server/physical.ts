// Shared core for starting the physical-verification service. Used by BOTH the
// staff server action (manual start) and the inbound portal webhook (HR trigger)
// so the "create + seed a checklist from declared data" behaviour lives in one
// place and stays identical regardless of who started it.

import { db } from "@/lib/db";
import {
  PhysicalVerificationStatus,
  PhysicalVisitKind,
  type PhysicalVerification,
} from "@prisma/client";

function fmtAddress(a: {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  return [a.line1, a.line2, `${a.city}, ${a.state} ${a.postalCode}`, a.country]
    .filter(Boolean)
    .join(", ");
}

export interface EnsurePhysicalOpts {
  origin: "MANUAL" | "PORTAL";
  reason?: string | null;
  startedById?: string | null;
  assignedAgentId?: string | null;
}

export interface EnsurePhysicalResult {
  verification: PhysicalVerification;
  created: boolean;
  seededVisits: number;
  reference: string;
}

/**
 * Idempotently ensure a physical-verification record exists for a case. On
 * first creation, seeds PENDING field visits from the candidate's declared
 * addresses, colleges, and employers so the field agent gets a concrete
 * checklist. Returns the record plus whether it was newly created.
 *
 * Throws if the case does not exist. Never required for clearance — purely
 * additive to the case.
 */
export async function ensurePhysicalVerification(
  caseId: string,
  opts: EnsurePhysicalOpts,
): Promise<EnsurePhysicalResult> {
  const kase = await db.case.findUnique({
    where: { id: caseId },
    include: { addresses: true, educations: true, employments: true },
  });
  if (!kase) throw new Error("Case not found.");

  const existing = await db.physicalVerification.findUnique({ where: { caseId } });
  if (existing) {
    return { verification: existing, created: false, seededVisits: 0, reference: kase.reference };
  }

  const verification = await db.physicalVerification.create({
    data: {
      caseId,
      origin: opts.origin,
      status: PhysicalVerificationStatus.REQUESTED,
      reason: opts.reason ?? null,
      startedById: opts.startedById ?? null,
      assignedAgentId: opts.assignedAgentId ?? null,
    },
  });

  const seed: { kind: PhysicalVisitKind; label: string; addressText: string | null }[] = [];
  for (const a of kase.addresses) {
    seed.push({
      kind: PhysicalVisitKind.ADDRESS,
      label: a.type === "PERMANENT" ? "Permanent address" : "Current address",
      addressText: fmtAddress(a),
    });
  }
  for (const e of kase.educations) {
    seed.push({
      kind: PhysicalVisitKind.EDUCATION,
      label: e.institution,
      addressText: [e.degree, e.board].filter(Boolean).join(" · ") || null,
    });
  }
  for (const e of kase.employments) {
    seed.push({
      kind: PhysicalVisitKind.EMPLOYMENT,
      label: e.employer,
      addressText: e.title || null,
    });
  }
  if (seed.length > 0) {
    await db.physicalVisit.createMany({
      data: seed.map((s) => ({ ...s, verificationId: verification.id })),
    });
  }

  return { verification, created: true, seededVisits: seed.length, reference: kase.reference };
}

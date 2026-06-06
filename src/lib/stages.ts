import { CandidateType, StageStatus, StageType } from "@prisma/client";

/**
 * Required BGV stages by candidate type — the SINGLE source of truth.
 *
 * - EMPLOYEE set = the canonical 8 (CANDIDATE / TRAINER / CONTRACTOR all use this).
 * - INTERN set   = the same minus EMPLOYMENT — final-year students have no prior
 *   employment to verify. (If they later convert to a full employee, an
 *   employment check is added then.)
 *
 * VETERAN is orthogonal: appended after the type-based set when applicable.
 *
 * case.ts (manual create), the portal webhook fallback, and the seed all call
 * {@link stagesForCandidateType} so the rule lives in exactly one place.
 */
export const EMPLOYEE_STAGES: StageType[] = [
  StageType.IDENTITY,
  StageType.ADDRESS,
  StageType.EDUCATION,
  StageType.EMPLOYMENT,
  StageType.CRIMINAL,
  StageType.PHOTO,
  StageType.VIDEO,
];

/** Interns skip EMPLOYMENT (7 stages). */
export const INTERN_STAGES: StageType[] = EMPLOYEE_STAGES.filter(
  (s) => s !== StageType.EMPLOYMENT,
);

/**
 * Required stages for a candidate type. Only INTERN is special (drops EMPLOYMENT);
 * CANDIDATE / TRAINER / CONTRACTOR all get the full employee set. Veteran is additive.
 */
export function stagesForCandidateType(
  type: CandidateType,
  requireVeteran = false,
): StageType[] {
  const base = type === CandidateType.INTERN ? INTERN_STAGES : EMPLOYEE_STAGES;
  return requireVeteran ? [...base, StageType.VETERAN] : base;
}

/** Stage types that have been retired and must never count as required. */
export const RETIRED_STAGE_TYPES: ReadonlySet<StageType> = new Set([StageType.REFERENCE]);

/**
 * The required stage set for a CASE — the single source of truth for the
 * review page, final submit gating, case status transitions, and the
 * "all stages submitted" desk ping.
 *
 * Reads the case's stored `requiredStages` (configured at provisioning time,
 * possibly a custom set from the portal webhook) rather than re-deriving from
 * candidateType — re-derivation disagrees with what was actually provisioned.
 * Falls back to the existing stage rows for legacy cases provisioned before
 * `requiredStages` was stored. Retired types (REFERENCE) are always excluded.
 */
export function requiredStagesForCase(
  kase: { requiredStages: StageType[] },
  stageRows: { type: StageType }[] = [],
): StageType[] {
  const configured = kase.requiredStages.filter((t) => !RETIRED_STAGE_TYPES.has(t));
  if (configured.length > 0) return configured;
  return [...new Set(stageRows.map((r) => r.type).filter((t) => !RETIRED_STAGE_TYPES.has(t)))];
}

export type ComputedCaseStatus =
  | "IN_PROGRESS"
  | "AWAITING_REVIEW"
  | "NEEDS_CORRECTION"
  | "CLEARED"
  | "REJECTED";

/**
 * Case status derived from its stage rows — the ONE implementation shared by
 * the candidate-side transition (server/actions/stage.ts) and the verifier-side
 * recompute (server/actions/review.ts), which had drifted into divergent copies.
 *
 * Only rows in the case's required set participate: a stray row (retired
 * REFERENCE, or a leftover from a candidate-type change) must never block
 * CLEARED or distort the aggregate status.
 */
export function computeCaseStatus(
  kase: { requiredStages: StageType[] },
  stageRows: { type: StageType; status: StageStatus }[],
): ComputedCaseStatus {
  const required = requiredStagesForCase(kase, stageRows);
  const rows = stageRows.filter((s) => required.includes(s.type));
  const approved = rows.filter((s) => s.status === "APPROVED").length;
  const anySubmitted = rows.some((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW");
  const anyCorrection = rows.some((s) => s.status === "NEEDS_CORRECTION");
  const anyRejected = rows.some((s) => s.status === "REJECTED");

  if (approved === required.length && required.length > 0) return "CLEARED";
  if (anyRejected) return "REJECTED";
  if (anyCorrection) return "NEEDS_CORRECTION";
  if (anySubmitted) return "AWAITING_REVIEW";
  return "IN_PROGRESS";
}

import { CandidateType, StageType } from "@prisma/client";

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
  StageType.REFERENCE,
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

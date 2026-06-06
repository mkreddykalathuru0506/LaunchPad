import { db } from "@/lib/db";
import { hash } from "argon2";
import { randomToken } from "@/lib/crypto";
import { Role, CandidateType } from "@prisma/client";
import { stagesForCandidateType } from "@/lib/stages";
import { withUniqueCaseReference } from "@/lib/case-reference";
import { notifyBgvTeam } from "@/server/notify";

export type ProvisionCandidateInput = {
  email: string;
  name: string;
  candidateType: CandidateType;
  positionTitle?: string | null;
  hiringManager?: string | null;
  startDate?: Date | null;
  requireVeteran?: boolean;
  assignedVerifierId?: string | null;
  managedById: string;
};

/**
 * Single source of truth for turning a candidate into a fillable BGV case:
 * upserts the User (role CANDIDATE), the Candidate profile, the Case, and one
 * Stage row per required stage (derived from candidateType + veteran flag).
 *
 * Used by both the manager "New case" flow (/team/new) and the admin
 * "Create user → Candidate" flow (/admin/users) so a candidate login always
 * lands on an editable /me instead of an empty "no active case" screen.
 *
 * Returns the freshly-minted {@link ProvisionResult.tempPassword}. It is only
 * meaningful when {@link ProvisionResult.isNewUser} is true — for an existing
 * user we deliberately do NOT reset their password (the upsert update omits it).
 */
export async function provisionCandidateCase(input: ProvisionCandidateInput) {
  const email = input.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

  const tempPassword = randomToken(8);
  const passwordHash = await hash(tempPassword);

  const user = await db.user.upsert({
    where: { email },
    update: { name: input.name, role: Role.CANDIDATE },
    create: {
      email,
      name: input.name,
      passwordHash,
      role: Role.CANDIDATE,
      emailVerified: new Date(),
    },
  });

  const candidate = await db.candidate.upsert({
    where: { userId: user.id },
    update: {
      candidateType: input.candidateType,
      positionTitle: input.positionTitle ?? null,
      hiringManager: input.hiringManager ?? null,
      startDate: input.startDate ?? null,
      isVeteran: input.requireVeteran === true,
    },
    create: {
      userId: user.id,
      candidateType: input.candidateType,
      positionTitle: input.positionTitle ?? null,
      hiringManager: input.hiringManager ?? null,
      startDate: input.startDate ?? null,
      isVeteran: input.requireVeteran === true,
    },
  });

  // Required BGV stages by candidate type — interns drop EMPLOYMENT; veteran is additive.
  const stages = stagesForCandidateType(input.candidateType, input.requireVeteran === true);

  // Whether a CASE already exists decides the "new case" notification below —
  // the USER pre-existing is the wrong signal (a user whose earlier case was
  // deleted still gets a brand-new case that the desk must hear about).
  const existingCase = await db.case.findUnique({
    where: { candidateId: candidate.id },
    select: { id: true },
  });

  // Reference allocation + collision retry live in withUniqueCaseReference —
  // the same path the portal webhook uses (count()+1 collided after any case
  // deletion and 500'd the manager/admin create flows). Only the CREATE path
  // allocates: re-provisioning an existing case never touches its reference,
  // so don't burn a query (and a number) computing one.
  const kase = existingCase
    ? await db.case.update({
        where: { candidateId: candidate.id },
        data: { assignedVerifierId: input.assignedVerifierId ?? null, requiredStages: stages },
      })
    : await withUniqueCaseReference((reference) =>
        db.case.create({
          data: {
            reference,
            candidateId: candidate.id,
            requiredStages: stages,
            assignedVerifierId: input.assignedVerifierId ?? null,
            managedById: input.managedById,
          },
        }),
      );

  for (const t of stages) {
    await db.stage.upsert({
      where: { caseId_type: { caseId: kase.id, type: t } },
      update: {},
      create: { caseId: kase.id, type: t },
    });
  }

  // Re-provisioning with a changed candidate type (e.g. CANDIDATE → INTERN)
  // shrinks the required set; drop rows for stages that are no longer required
  // but ONLY untouched ones — anything the candidate started keeps its data
  // (status math ignores non-required rows either way).
  await db.stage.deleteMany({
    where: { caseId: kase.id, type: { notIn: stages }, status: "NOT_STARTED" },
  });

  // Alert the BGV desk that a new candidate case exists (in-app bell). Only
  // when the CASE is new — re-running provisioning for an existing case
  // shouldn't spam. (notifyBgvTeam is best-effort and never throws, so a
  // notification hiccup can't fail provisioning after the case exists.)
  if (!existingCase) {
    await notifyBgvTeam(kase.id, {
      kind: "CASE_CREATED",
      title: `New candidate — ${kase.reference}`,
      body: `${input.name} was added for background verification. Their case is now open.`,
      link: `/work/case/${kase.id}`,
    });
  }

  return { user, candidate, kase, tempPassword, isNewUser: !existing };
}

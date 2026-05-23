"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { randomToken } from "@/lib/crypto";
import { hash } from "argon2";
import { Role, CandidateType, StageType } from "@prisma/client";
import { emailCandidateInvited, emailVerifierAssigned } from "@/server/emails";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  candidateType: z.nativeEnum(CandidateType),
  positionTitle: z.string().min(1),
  hiringManager: z.string().optional(),
  startDate: z.string().optional(),
  requireVeteran: z.string().optional(),
  assignedVerifierId: z.string().optional(),
});

export async function createCase(formData: FormData) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const parsed = createSchema.parse({
    email: formData.get("email"),
    name: formData.get("name"),
    candidateType: formData.get("candidateType"),
    positionTitle: formData.get("positionTitle"),
    hiringManager: formData.get("hiringManager")?.toString() || undefined,
    startDate: formData.get("startDate")?.toString() || undefined,
    requireVeteran: formData.get("requireVeteran")?.toString() || undefined,
    assignedVerifierId: formData.get("assignedVerifierId")?.toString() || undefined,
  });

  const tempPassword = randomToken(8);
  const passwordHash = await hash(tempPassword);

  const user = await db.user.upsert({
    where: { email: parsed.email.toLowerCase() },
    update: { name: parsed.name },
    create: {
      email: parsed.email.toLowerCase(),
      name: parsed.name,
      passwordHash,
      role: Role.CANDIDATE,
      emailVerified: new Date(),
    },
  });

  const candidate = await db.candidate.upsert({
    where: { userId: user.id },
    update: {
      candidateType: parsed.candidateType,
      positionTitle: parsed.positionTitle,
      hiringManager: parsed.hiringManager ?? null,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      isVeteran: parsed.requireVeteran === "on",
    },
    create: {
      userId: user.id,
      candidateType: parsed.candidateType,
      positionTitle: parsed.positionTitle,
      hiringManager: parsed.hiringManager ?? null,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      isVeteran: parsed.requireVeteran === "on",
    },
  });

  const defaultStages: StageType[] = [
    StageType.IDENTITY, StageType.ADDRESS, StageType.EDUCATION,
    StageType.EMPLOYMENT, StageType.CRIMINAL, StageType.PHOTO,
    StageType.VIDEO, StageType.REFERENCE,
  ];
  const stages = parsed.requireVeteran === "on" ? [...defaultStages, StageType.VETERAN] : defaultStages;

  const count = await db.case.count();
  const reference = `LP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const kase = await db.case.upsert({
    where: { candidateId: candidate.id },
    update: { assignedVerifierId: parsed.assignedVerifierId ?? null, requiredStages: stages },
    create: {
      reference,
      candidateId: candidate.id,
      requiredStages: stages,
      assignedVerifierId: parsed.assignedVerifierId ?? null,
      managedById: session.user.id,
    },
  });

  for (const t of stages) {
    await db.stage.upsert({
      where: { caseId_type: { caseId: kase.id, type: t } },
      update: {},
      create: { caseId: kase.id, type: t },
    });
  }

  await audit({ actorId: session.user.id, caseId: kase.id, action: "case.created", metadata: { reference } });

  // Email candidate the invitation + temporary password
  await emailCandidateInvited({
    to: user.email,
    name: parsed.name,
    reference: kase.reference,
    tempPassword,
    caseId: kase.id,
  });

  // If a verifier was pre-assigned, email them too
  if (parsed.assignedVerifierId) {
    await emailVerifierAssigned({ caseId: kase.id, verifierId: parsed.assignedVerifierId });
  }

  revalidatePath("/team");
  redirect(`/work/case/${kase.id}`);
}

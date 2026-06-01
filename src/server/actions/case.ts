"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { CandidateType } from "@prisma/client";
import { provisionCandidateCase } from "@/server/provision";
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

  const { user, kase, tempPassword } = await provisionCandidateCase({
    email: parsed.email,
    name: parsed.name,
    candidateType: parsed.candidateType,
    positionTitle: parsed.positionTitle,
    hiringManager: parsed.hiringManager ?? null,
    startDate: parsed.startDate ? new Date(parsed.startDate) : null,
    requireVeteran: parsed.requireVeteran === "on",
    assignedVerifierId: parsed.assignedVerifierId ?? null,
    managedById: session.user.id,
  });

  await audit({ actorId: session.user.id, caseId: kase.id, action: "case.created", metadata: { reference: kase.reference } });

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

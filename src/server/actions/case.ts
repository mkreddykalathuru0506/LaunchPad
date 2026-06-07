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
  // Requesting-company filter: listed = ElvixIT portal integration (results
  // pushed back automatically); unlisted = manual, results emailed back.
  companySource: z.enum(["listed", "unlisted"]).default("unlisted"),
  companyName: z.string().max(120).optional(),
  appName: z.string().max(120).optional(),
  resultEmail: z.string().email().optional(),
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
    companySource: formData.get("companySource")?.toString() || undefined,
    companyName: formData.get("companyName")?.toString().trim() || undefined,
    appName: formData.get("appName")?.toString().trim() || undefined,
    resultEmail: formData.get("resultEmail")?.toString().trim() || undefined,
  });

  // Listed = the ElvixIT portal integration: company is fixed and results
  // return via the portal callback. Non-listed must say who to email back.
  const listed = parsed.companySource === "listed";
  if (!listed && !parsed.companyName) {
    throw new Error("Company name is required for a non-listed company.");
  }
  if (!listed && !parsed.resultEmail) {
    throw new Error("Result email is required for a non-listed company (status + report are sent there).");
  }

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
    companyName: listed ? "ElvixIT" : parsed.companyName!,
    appName: parsed.appName ?? null,
    resultEmail: listed ? null : parsed.resultEmail!,
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

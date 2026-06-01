"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { hash } from "argon2";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Role, CandidateType } from "@prisma/client";
import { randomToken } from "@/lib/crypto";
import { emailUserWelcome, emailCandidateInvited } from "@/server/emails";
import { provisionCandidateCase } from "@/server/provision";
import { roleLabels } from "@/lib/utils";

const upsertSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.nativeEnum(Role),
  active: z.string().optional(),
  // Only consulted when role === CANDIDATE; defaults to a full-time candidate.
  candidateType: z.nativeEnum(CandidateType).optional(),
  positionTitle: z.string().optional(),
});

export async function upsertUser(formData: FormData) {
  const session = await requireRole("ADMIN");
  const parsed = upsertSchema.parse({
    id: formData.get("id")?.toString() || undefined,
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    active: formData.get("active")?.toString() || undefined,
    candidateType: formData.get("candidateType")?.toString() || undefined,
    positionTitle: formData.get("positionTitle")?.toString() || undefined,
  });
  if (parsed.id) {
    await db.user.update({
      where: { id: parsed.id },
      data: { email: parsed.email.toLowerCase(), name: parsed.name, role: parsed.role, active: parsed.active === "on" },
    });
    await audit({ actorId: session.user.id, action: "user.updated", target: parsed.id });
  } else if (parsed.role === Role.CANDIDATE) {
    // A candidate login is useless without a BGV case to fill in — otherwise the
    // candidate logs in and /me shows the empty "no active case yet" screen. So
    // provision the Candidate + Case + stages up front (same path as /team/new)
    // and send the case invitation rather than the generic welcome email.
    const { user, kase, tempPassword } = await provisionCandidateCase({
      email: parsed.email,
      name: parsed.name,
      candidateType: parsed.candidateType ?? CandidateType.CANDIDATE,
      positionTitle: parsed.positionTitle ?? null,
      managedById: session.user.id,
    });
    await audit({
      actorId: session.user.id,
      caseId: kase.id,
      action: "case.created",
      target: user.id,
      metadata: { reference: kase.reference, via: "admin.users" },
    });
    await emailCandidateInvited({
      to: user.email,
      name: parsed.name,
      reference: kase.reference,
      tempPassword,
      caseId: kase.id,
    });
  } else {
    const tempPassword = randomToken(10);
    const passwordHash = await hash(tempPassword);
    const u = await db.user.create({
      data: { email: parsed.email.toLowerCase(), name: parsed.name, role: parsed.role, active: parsed.active !== "off", passwordHash, emailVerified: new Date() },
    });
    await audit({ actorId: session.user.id, action: "user.created", target: u.id });
    await emailUserWelcome({
      to: u.email,
      name: u.name ?? u.email,
      role: roleLabels[u.role],
      tempPassword,
    });
  }
  revalidatePath("/admin/users");
}

export async function deactivateUser(formData: FormData) {
  const session = await requireRole("ADMIN");
  const id = formData.get("id")?.toString();
  if (!id) return;
  await db.user.update({ where: { id }, data: { active: false } });
  await audit({ actorId: session.user.id, action: "user.deactivated", target: id });
  revalidatePath("/admin/users");
}

export async function activateUser(formData: FormData) {
  const session = await requireRole("ADMIN");
  const id = formData.get("id")?.toString();
  if (!id) return;
  await db.user.update({ where: { id }, data: { active: true } });
  await audit({ actorId: session.user.id, action: "user.activated", target: id });
  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const session = await requireRole("ADMIN");
  const id = formData.get("id")?.toString();
  if (!id) return;
  // Self-delete guard — an admin clicking Delete on their own row would
  // immediately invalidate their session and lock them out.
  if (id === session.user.id) {
    throw new Error("You cannot delete your own account. Ask another admin to do it.");
  }
  // Audit BEFORE the delete: once the user row is gone, the cascade
  // wipes their child records but we still want a record of who/when.
  await audit({ actorId: session.user.id, action: "user.deleted", target: id });
  await db.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}

const settingsSchema = z.object({
  appName: z.string().min(1),
  brandColor: z.string().min(4),
  supportEmail: z.string().email(),
  slaHoursPerStage: z.string().regex(/^\d+$/),
});

export async function updateSettings(formData: FormData) {
  const session = await requireRole("ADMIN");
  const parsed = settingsSchema.parse({
    appName: formData.get("appName"),
    brandColor: formData.get("brandColor"),
    supportEmail: formData.get("supportEmail"),
    slaHoursPerStage: formData.get("slaHoursPerStage"),
  });
  await db.settings.upsert({
    where: { id: 1 },
    update: {
      appName: parsed.appName,
      brandColor: parsed.brandColor,
      supportEmail: parsed.supportEmail,
      slaHoursPerStage: Number(parsed.slaHoursPerStage),
    },
    create: {
      id: 1,
      appName: parsed.appName,
      brandColor: parsed.brandColor,
      supportEmail: parsed.supportEmail,
      slaHoursPerStage: Number(parsed.slaHoursPerStage),
    },
  });
  await audit({ actorId: session.user.id, action: "settings.updated" });
  revalidatePath("/admin/settings");
}

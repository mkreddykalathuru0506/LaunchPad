"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { hash } from "argon2";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Role } from "@prisma/client";
import { randomToken } from "@/lib/crypto";
import { emailUserWelcome } from "@/server/emails";
import { roleLabels } from "@/lib/utils";

const upsertSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.nativeEnum(Role),
  active: z.string().optional(),
});

export async function upsertUser(formData: FormData) {
  const session = await requireRole("ADMIN");
  const parsed = upsertSchema.parse({
    id: formData.get("id")?.toString() || undefined,
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    active: formData.get("active")?.toString() || undefined,
  });
  if (parsed.id) {
    await db.user.update({
      where: { id: parsed.id },
      data: { email: parsed.email.toLowerCase(), name: parsed.name, role: parsed.role, active: parsed.active === "on" },
    });
    await audit({ actorId: session.user.id, action: "user.updated", target: parsed.id });
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

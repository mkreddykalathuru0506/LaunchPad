"use server";

import { hash } from "argon2";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/password";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Rotate the signed-in candidate's password. Validates against the standard
 * passwordSchema (10+ chars, mixed case, digit, symbol), argon2-hashes,
 * clears the mustChangePassword flag, and writes an audit event.
 *
 * Does NOT require the old password — the temp password was just verified
 * by signIn() and is single-use by design.
 */
export async function changePasswordAction(
  newPassword: string,
  confirmPassword: string,
): Promise<ChangePasswordResult> {
  const session = await requireRole("CANDIDATE");

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Passwords don't match." };
  }
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const hashed = await hash(newPassword);
  await db.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: hashed,
      mustChangePassword: false,
    },
  });
  try {
    await audit({
      actorId: session.user.id,
      action: "user.password_changed",
      metadata: { reason: "first_login_rotation" },
    });
  } catch (e) {
    logger.warn("change_password.audit_failed", {
      userId: session.user.id,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  revalidatePath("/me");
  return { ok: true };
}

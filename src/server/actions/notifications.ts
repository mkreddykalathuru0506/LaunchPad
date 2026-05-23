"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { audit } from "@/lib/audit";

const markReadSchema = z.object({
  id: z.string().min(1),
});

function extractId(input: FormData | { id: string }): string | null {
  if (input instanceof FormData) {
    const raw = input.get("id");
    return typeof raw === "string" ? raw : null;
  }
  return input?.id ?? null;
}

export async function markNotificationRead(input: FormData | { id: string }) {
  const session = await requireSession();
  const parsed = markReadSchema.parse({ id: extractId(input) });

  // Verify ownership before flipping
  const existing = await db.notification.findUnique({
    where: { id: parsed.id },
    select: { id: true, userId: true, readAt: true },
  });
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Notification not found");
  }

  if (!existing.readAt) {
    await db.notification.update({
      where: { id: existing.id },
      data: { readAt: new Date() },
    });
    await audit({
      actorId: session.user.id,
      action: "notification.read",
      target: existing.id,
    });
  }

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const session = await requireSession();
  const result = await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  await audit({
    actorId: session.user.id,
    action: "notification.read_all",
    metadata: { count: result.count },
  });
  revalidatePath("/notifications");
}

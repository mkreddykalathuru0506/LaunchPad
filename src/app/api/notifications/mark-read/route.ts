import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getUnreadCount } from "@/server/queries/notifications";

const bodySchema = z
  .object({
    id: z.string().min(1).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.id) || v.all === true, {
    message: "id or all is required",
  });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.all) {
    const result = await db.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    await audit({
      actorId: session.user.id,
      action: "notification.read_all",
      metadata: { count: result.count },
    });
  } else if (parsed.data.id) {
    const existing = await db.notification.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, userId: true, readAt: true },
    });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
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
  }

  const unread = await getUnreadCount(session.user.id);
  return NextResponse.json({ ok: true, unread });
}

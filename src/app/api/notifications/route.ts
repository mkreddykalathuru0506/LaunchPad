import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getNotificationsForUser,
  getUnreadCount,
} from "@/server/queries/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [items, unread] = await Promise.all([
    getNotificationsForUser(session.user.id, 8),
    getUnreadCount(session.user.id),
  ]);
  return NextResponse.json({ items, unread });
}

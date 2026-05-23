import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, type AppSession } from "./auth";
import { Role } from "@prisma/client";

export async function getSession(): Promise<AppSession | null> {
  return (await getServerSession(authOptions)) as AppSession | null;
}

export async function requireSession(): Promise<AppSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireRole(allowed: Role | Role[]): Promise<AppSession> {
  const s = await requireSession();
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(s.user.role)) redirect("/forbidden");
  return s;
}

export function hasRole(session: AppSession | null, allowed: Role | Role[]): boolean {
  if (!session) return false;
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(session.user.role);
}

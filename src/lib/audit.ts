import { db } from "./db";
import { headers } from "next/headers";

export async function audit(opts: {
  actorId?: string | null;
  caseId?: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
}) {
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const h = headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    ua = h.get("user-agent");
  } catch {}
  await db.auditEvent.create({
    data: {
      actorId: opts.actorId ?? null,
      caseId: opts.caseId ?? null,
      action: opts.action,
      target: opts.target ?? null,
      metadata: opts.metadata ?? undefined,
      ip,
      userAgent: ua,
    },
  });
}

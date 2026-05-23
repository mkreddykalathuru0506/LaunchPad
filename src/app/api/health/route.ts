import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "ok" | "down" = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "down";
  }

  const body = {
    status: dbStatus === "ok" ? ("ok" as const) : ("degraded" as const),
    version: process.env.npm_package_version ?? null,
    uptime: process.uptime(),
    db: dbStatus,
  };

  return NextResponse.json(body, {
    status: dbStatus === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

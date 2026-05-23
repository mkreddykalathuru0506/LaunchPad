import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?error=invalid", req.url));
  const vt = await db.verificationToken.findUnique({ where: { token } });
  if (!vt || vt.expires < new Date()) {
    return NextResponse.redirect(new URL("/login?error=expired", req.url));
  }
  await db.verificationToken.delete({ where: { token } });
  const url = new URL("/login", req.url);
  url.searchParams.set("hint", vt.identifier);
  return NextResponse.redirect(url);
}

// Magic-link redeem.
//
// Primary candidate-login path is now email + temp password (see the
// /api/webhooks/portal/candidate receiver). This route stays alive as a
// FALLBACK: if the candidate can't / won't type the temp password, the magic
// link in the same email logs them in directly.
//
// We mint a NextAuth JWT (matches lib/auth.ts session.strategy="jwt") and
// drop it into the same cookie name NextAuth itself uses, so subsequent
// requests get a real session.

import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Match next-auth/v4 defaults. We bind to the http (non-secure) cookie name in
// local dev; if APP_URL is https we use the __Secure- prefix.
function sessionCookieName(): string {
  const isHttps = env.NEXTAUTH_URL.startsWith("https://");
  return isHttps ? "__Secure-next-auth.session-token" : "next-auth.session-token";
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?error=invalid", env.APP_URL));

  const vt = await db.verificationToken.findUnique({ where: { token } });
  if (!vt || vt.expires < new Date()) {
    return NextResponse.redirect(new URL("/login?error=expired", env.APP_URL));
  }
  // Single-use: consume.
  await db.verificationToken.delete({ where: { token } });

  // Identifier is the user's lowercased email.
  const user = await db.user.findUnique({ where: { email: vt.identifier.toLowerCase() } });
  if (!user || !user.active) {
    // No user — fall back to the legacy hint-on-login UX so the candidate at
    // least knows which email to use.
    const url = new URL("/login", env.APP_URL);
    url.searchParams.set("hint", vt.identifier);
    url.searchParams.set("error", "no-account");
    return NextResponse.redirect(url);
  }

  // Build a NextAuth-compatible JWT. Shape must match the `jwt` callback in
  // lib/auth.ts (id + role on the token, plus the standard sub/email/name).
  const maxAge = 60 * 60 * 8;
  let signedJwt: string;
  try {
    signedJwt = await encode({
      token: {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: user.role,
      } as any,
      secret: env.NEXTAUTH_SECRET,
      maxAge,
    });
  } catch (e) {
    logger.error("auth_link.jwt_encode_failed", {
      email: user.email,
      error: e instanceof Error ? e.message : String(e),
    });
    const url = new URL("/login", env.APP_URL);
    url.searchParams.set("hint", user.email);
    url.searchParams.set("error", "magic-link-failed");
    return NextResponse.redirect(url);
  }

  // Redirect to /post-login which will route by role. Force-password-change
  // candidates will hit /me, and /me's page will then route them to
  // /me/change-password (see src/app/me/page.tsx).
  //
  // We use env.APP_URL rather than req.url because behind Docker/Caddy the
  // inbound URL's host can be the in-container HOSTNAME (e.g. 0.0.0.0:3000),
  // and Location: 0.0.0.0 is not reachable from the user's browser.
  const response = NextResponse.redirect(new URL("/post-login", env.APP_URL));
  const isHttps = env.NEXTAUTH_URL.startsWith("https://");
  response.cookies.set({
    name: sessionCookieName(),
    value: signedJwt,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge,
  });
  logger.info("auth_link.signed_in", { userId: user.id, email: user.email });
  return response;
}

// First-login password rotation gate.
//
// When a candidate is provisioned by the portal webhook receiver, their User
// row is created with mustChangePassword=true and a server-generated 12-char
// temporary password (surfaced ONCE in the invite email).
//
// /me/page.tsx server-redirects any logged-in candidate with that flag to
// this page. The candidate sets a new password (validated against
// lib/password.ts), the flag is cleared, and they're sent back to /me where
// the normal dashboard renders.
//
// We intentionally don't require the OLD password here — the temp password
// is single-use and already validated by signIn(). Requiring it again is
// pure friction since the candidate just typed it 30s ago.

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await requireRole("CANDIDATE");
  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true, email: true },
  });
  // If the user landed here but doesn't actually need to rotate, bounce them
  // straight to the dashboard — no useful action available.
  if (!u?.mustChangePassword) {
    redirect("/me");
  }
  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="rounded-2xl">
        <CardHeader>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Credential Rotation
          </span>
          <CardTitle className="font-display">Set a new password</CardTitle>
          <CardDescription>
            You signed in with a temporary password. Please choose a new password
            before continuing — it'll only take a moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm email={u.email} />
        </CardContent>
      </Card>
    </div>
  );
}

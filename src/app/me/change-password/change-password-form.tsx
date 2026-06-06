"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { changePasswordAction } from "./actions";

/**
 * Two-field new-password form. On success we force a fresh login by signing
 * out — the easiest way to get a brand-new JWT that no longer carries any
 * "first-login" state (mustChangePassword was already JWT-less in our current
 * setup, but signOut keeps the model simple and makes any future flag-on-JWT
 * additions safe by default).
 */
export function ChangePasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction(pwd1, pwd2);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Successful rotation — sign out and bounce back to login so the
      // candidate re-authenticates with their new password. This proves
      // the new credentials work end-to-end before they hit the dashboard.
      await signOut({ redirect: false });
      router.push("/login?changed=1");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-dashed bg-secondary/40 px-3.5 py-2.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Signed in as
        </span>
        <div className="mt-0.5 font-mono text-[13px] text-foreground">{email}</div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pwd1">New password</Label>
        <Input
          id="pwd1"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={pwd1}
          onChange={(e) => setPwd1(e.target.value)}
        />
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
          10+ characters, mixed case, with at least one digit and one symbol.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pwd2">Confirm new password</Label>
        <Input
          id="pwd2"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        Set new password
      </Button>
    </form>
  );
}

"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function LoginForm({ callbackUrl, error: initialError }: { callbackUrl?: string; error?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const hint = params.get("hint") ?? "";
  const changed = params.get("changed") === "1";
  const [email, setEmail] = useState(hint);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
      callbackUrl: callbackUrl ?? params.get("callbackUrl") ?? "/post-login",
    });
    setPending(false);
    if (!res || res.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(res.url ?? "/post-login");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {changed && !error && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs text-success"
        >
          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Your password was updated. Please sign in with the new password.</span>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

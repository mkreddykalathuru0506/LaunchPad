"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function LoginForm({ callbackUrl, error: initialError }: { callbackUrl?: string; error?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
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
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Demo accounts (password: <code>Passw0rd!</code>)</div>
        <ul className="mt-1 space-y-0.5">
          <li>admin@elivixit.com</li>
          <li>manager@elivixit.com</li>
          <li>verifier1@elivixit.com</li>
          <li>bella@example.com (candidate)</li>
        </ul>
      </div>
    </form>
  );
}

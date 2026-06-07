import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset } from "@/server/actions/auth";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";

type Status = "sent" | "rate" | "invalid";

const STATUS_COPY: Record<Status, { kind: "success" | "error"; message: string }> = {
  sent: {
    kind: "success",
    message: "If that email is registered, a sign-in link is on its way. Check your inbox.",
  },
  rate: {
    kind: "error",
    message: "Too many requests. Please wait a minute before trying again.",
  },
  invalid: {
    kind: "error",
    message: "That doesn't look like a valid email. Please check and try again.",
  },
};

export const metadata: Metadata = { title: "Magic link" };

export default function Forgot({ searchParams }: { searchParams: { status?: string } }) {
  const status = STATUS_COPY[searchParams.status as Status];

  return (
    <div className="relative grid min-h-screen place-items-center p-6">
      <div className="absolute inset-0 -z-10 gradient-hero" aria-hidden />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Logo />
          <CardTitle className="mt-4">Recover access</CardTitle>
          <CardDescription>Enter your work email and we'll send a sign-in link.</CardDescription>
        </CardHeader>
        <CardContent>
          {status?.kind === "success" && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs text-success"
            >
              <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{status.message}</span>
            </div>
          )}
          {status?.kind === "error" && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{status.message}</span>
            </div>
          )}
          <form action={requestPasswordReset} className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Access · Recovery
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px]">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <SubmitButton type="submit" variant="brand" className="w-full">
              <Mail className="h-4 w-4" aria-hidden />
              Send link
            </SubmitButton>
          </form>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/login" className="font-medium text-brand underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Permanently-navy dossier panel — identical in both themes. */}
      <div className="panel-navy relative hidden flex-col justify-between overflow-hidden lg:flex">
        <div aria-hidden className="dot-grid-light absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_70%_at_30%_20%,#000,transparent)]" />
        <div className="relative p-10">
          <Logo variant="dark" />
        </div>
        <div className="relative p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-sky-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            ElvixIT internal · BGV
          </span>
          <blockquote className="mt-6 max-w-md font-display text-3xl font-bold leading-snug tracking-tight text-white">
            "Verified people. Verified records. Verified before day one."
          </blockquote>
          <div className="mt-4 text-sm text-slate-400">— ElvixIT BGV Team</div>
        </div>
        <div className="relative">
          <div className="px-10 pb-4 text-xs text-slate-400">
            Restricted internal system. Unauthorized access is monitored and may be prosecuted.
          </div>
          <div className="border-t border-dashed border-white/15 px-10 py-3">
            <div aria-hidden className="mrz text-[10px] text-slate-500">
              {"LP<ELVIXIT<BGV<<RESTRICTED<ACCESS<<AUDITED<<<<<<<<<<<<"}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="font-display text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Sign in to continue your verification.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={searchParams.callbackUrl} error={searchParams.error} />
            <div className="mt-4 text-center text-xs text-muted-foreground">
              Trouble signing in?{" "}
              <Link href="/forgot" className="font-medium text-brand underline-offset-4 hover:underline">
                Get a magic link
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Permanently-navy brand panel (like the sidebar) — sidebar tokens stay
          navy/near-white in BOTH themes, unlike primary which inverts in dark. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar text-sidebar-foreground lg:flex">
        {/* Brand wash — navy + sky, consistent with the landing hero. */}
        <div className="absolute inset-0 -z-10 mesh-aurora opacity-90" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-sidebar-foreground/15 to-transparent" aria-hidden />
        <div className="p-10">
          <Logo forSidebar />
        </div>
        <div className="p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-foreground/20 bg-sidebar-foreground/5 px-3 py-1 text-xs font-medium text-sidebar-foreground/90">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            ElivixIT internal · Background verification
          </span>
          <blockquote className="mt-6 max-w-md text-2xl font-medium leading-relaxed">
            "Verified people. Verified records. Verified before day one."
          </blockquote>
          <div className="mt-4 text-sm text-sidebar-foreground/80">— ElivixIT BGV Team</div>
        </div>
        <div className="p-10 text-xs text-sidebar-foreground/70">
          Restricted internal system. Unauthorized access is monitored and may be prosecuted.
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
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

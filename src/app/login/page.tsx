import Link from "next/link";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary text-primary-foreground lg:flex">
        <div className="p-10">
          <Logo className="text-primary-foreground" />
        </div>
        <div className="p-10">
          <blockquote className="max-w-md text-2xl font-medium leading-relaxed">
            "Verified people. Verified records. Verified before day one."
          </blockquote>
          <div className="mt-4 text-sm opacity-80">— ElivixIT BGV Team</div>
        </div>
        <div className="p-10 text-xs opacity-70">
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
              <Link href="/forgot" className="text-primary underline-offset-4 hover:underline">
                Get a magic link
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

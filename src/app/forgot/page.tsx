import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/server/actions/auth";

export default function Forgot() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Logo />
          <CardTitle className="mt-4">Recover access</CardTitle>
          <CardDescription>Enter your work email and we'll send a sign-in link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={requestPasswordReset} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">Send link</Button>
          </form>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">Back to sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

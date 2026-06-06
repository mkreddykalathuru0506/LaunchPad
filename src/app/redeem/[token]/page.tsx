import Link from "next/link";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Link2Off } from "lucide-react";

export default async function Redeem({ params }: { params: { token: string } }) {
  const link = await db.magicLink.findUnique({ where: { token: params.token } });
  if (!link || link.consumedAt || link.expiresAt < new Date()) {
    return (
      <div className="relative grid min-h-screen place-items-center p-6 text-center">
        <div className="absolute inset-0 -z-10 gradient-hero" aria-hidden />
        <div className="flex max-w-md flex-col items-center gap-6">
          <Logo />
          <div
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning-foreground ring-1 ring-inset ring-warning/20 dark:text-warning"
          >
            <Link2Off className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">This link is no longer valid</h1>
            <p className="text-sm text-muted-foreground">
              It may have already been used or expired. Contact your BG verifier for a new one.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }
  await db.magicLink.update({ where: { id: link.id }, data: { consumedAt: new Date() } });
  await audit({ caseId: link.caseId, action: "magic-link.redeemed", metadata: { stage: link.stageType } });

  if (link.purpose === "RESUBMIT") {
    redirect(`/me/stage/${link.stageType.toLowerCase()}?from=resubmit`);
  }
  redirect("/me");
}

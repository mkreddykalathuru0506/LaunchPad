import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";

export default async function Redeem({ params }: { params: { token: string } }) {
  const link = await db.magicLink.findUnique({ where: { token: params.token } });
  if (!link || link.consumedAt || link.expiresAt < new Date()) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">This link is no longer valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have already been used or expired. Contact your BG verifier for a new one.
          </p>
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

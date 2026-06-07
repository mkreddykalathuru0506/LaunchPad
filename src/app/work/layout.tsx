export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/app-shell/app-shell";
import { buildNav } from "@/components/app-shell/nav";

export default async function VerifierLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  return (
    <AppShell session={session} nav={await buildNav(session)}>
      {children}
    </AppShell>
  );
}

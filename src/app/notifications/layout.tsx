export const dynamic = "force-dynamic";

import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell/app-shell";
import { buildNav } from "@/components/app-shell/nav";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  // Same full role-based catalog as every other section — landing here must
  // not shrink the menu to a two-item stub.
  return (
    <AppShell session={session} nav={await buildNav(session)}>
      {children}
    </AppShell>
  );
}

export const dynamic = "force-dynamic";

import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell/app-shell";
import { Bell, Home } from "lucide-react";
import { Role } from "@prisma/client";

const navByRole: Record<Role, { href: string; label: string }[]> = {
  CANDIDATE: [{ href: "/me", label: "Dashboard" }],
  VERIFIER: [{ href: "/work", label: "Queue" }],
  MANAGER: [{ href: "/team", label: "Team" }],
  ADMIN: [{ href: "/admin", label: "Admin" }],
};

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const home = navByRole[session.user.role]?.[0] ?? { href: "/", label: "Home" };
  // The modern sidebar shell (skip link, theme toggle, search, bell) — the
  // old header-only shell drifted behind it and is gone.
  return (
    <AppShell
      session={session}
      nav={[
        { section: "Workspace", href: home.href, label: home.label, icon: <Home /> },
        { section: "Account", href: "/notifications", label: "Notifications", icon: <Bell /> },
      ]}
    >
      {children}
    </AppShell>
  );
}

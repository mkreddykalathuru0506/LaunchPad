import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app/app-shell";
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
  return (
    <AppShell
      session={session}
      nav={[
        { href: home.href, label: home.label, icon: <Home className="h-4 w-4" /> },
        { href: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}

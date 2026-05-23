import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/app-shell/app-shell";
import { Inbox, ListChecks, Bell, LayoutDashboard } from "lucide-react";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/server/queries/notifications";

export default async function VerifierLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  const [pending, unread] = await Promise.all([
    db.case.count({
      where: {
        status: { in: ["AWAITING_REVIEW", "IN_PROGRESS", "NEEDS_CORRECTION"] },
        ...(session.user.role === "VERIFIER" ? { assignedVerifierId: session.user.id } : {}),
      },
    }),
    getUnreadCount(session.user.id),
  ]);

  return (
    <AppShell
      session={session}
      nav={[
        { section: "Workspace", href: "/work", label: "Queue", icon: <Inbox className="h-4 w-4" />, badge: pending > 0 ? pending : undefined },
        { section: "Workspace", href: "/work/all", label: "All cases", icon: <ListChecks className="h-4 w-4" /> },
        ...(session.user.role !== "VERIFIER"
          ? [{ section: "Team", href: "/team", label: "Team overview", icon: <LayoutDashboard className="h-4 w-4" /> }]
          : []),
        { section: "Account", href: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, badge: unread > 0 ? unread : undefined },
      ]}
    >
      {children}
    </AppShell>
  );
}

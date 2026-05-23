import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/app-shell/app-shell";
import { LayoutDashboard, FileBarChart2, UserPlus, Inbox, Bell } from "lucide-react";
import { getUnreadCount } from "@/server/queries/notifications";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const unread = await getUnreadCount(session.user.id);
  return (
    <AppShell
      session={session}
      nav={[
        { section: "Team", href: "/team", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
        { section: "Team", href: "/team/new", label: "New case", icon: <UserPlus className="h-4 w-4" /> },
        { section: "Team", href: "/team/reports", label: "Reports", icon: <FileBarChart2 className="h-4 w-4" /> },
        { section: "Work", href: "/work", label: "Review queue", icon: <Inbox className="h-4 w-4" /> },
        { section: "Account", href: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, badge: unread > 0 ? unread : undefined },
      ]}
    >
      {children}
    </AppShell>
  );
}

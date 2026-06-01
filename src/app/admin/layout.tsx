export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/app-shell/app-shell";
import { Shield, Users, UserPlus, Activity, Mail, SlidersHorizontal, Bell } from "lucide-react";
import { getUnreadCount } from "@/server/queries/notifications";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  const unread = await getUnreadCount(session.user.id);
  return (
    <AppShell
      session={session}
      nav={[
        { section: "System", href: "/admin", label: "Overview", icon: <Shield className="h-4 w-4" /> },
        { section: "System", href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
        { section: "System", href: "/team/new", label: "Add candidate", icon: <UserPlus className="h-4 w-4" /> },
        { section: "System", href: "/admin/audit", label: "Audit log", icon: <Activity className="h-4 w-4" /> },
        { section: "System", href: "/admin/email-log", label: "Email log", icon: <Mail className="h-4 w-4" /> },
        { section: "System", href: "/admin/settings", label: "Settings", icon: <SlidersHorizontal className="h-4 w-4" /> },
        { section: "Account", href: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, badge: unread > 0 ? unread : undefined },
      ]}
    >
      {children}
    </AppShell>
  );
}

export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/app-shell/app-shell";
import { db } from "@/lib/db";
import { Home, FileText, User, Bell } from "lucide-react";
import { getUnreadCount } from "@/server/queries/notifications";

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("CANDIDATE");
  const unread = await getUnreadCount(session.user.id);

  return (
    <AppShell
      session={session}
      nav={[
        { section: "Workspace", href: "/me", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
        { section: "Workspace", href: "/me/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
        { section: "Account", href: "/me/profile", label: "Profile", icon: <User className="h-4 w-4" /> },
        { section: "Account", href: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, badge: unread > 0 ? unread : undefined },
      ]}
    >
      {children}
    </AppShell>
  );
}

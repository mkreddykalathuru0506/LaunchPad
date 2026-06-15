import { Role } from "@prisma/client";
import {
  Home, FileText, User, Bell, Inbox, ListChecks, LayoutDashboard, UserPlus,
  FileBarChart2, Shield, Users, Activity, Mail, SlidersHorizontal, MapPinned,
} from "lucide-react";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/server/queries/notifications";
import type { AppSession } from "@/lib/auth";
import type { SidebarNavItem } from "./sidebar";

/**
 * THE navigation source of truth — every portal layout renders this.
 *
 * The sidebar must always show the user's FULL service catalog, grouped by
 * category, no matter which section they're currently in. (Previously each
 * layout shipped its own partial nav array, so clicking Notifications or
 * crossing into /team swapped the whole menu — which read as the sidebar
 * "collapsing" and services "overriding" each other.)
 */
export async function buildNav(session: AppSession): Promise<SidebarNavItem[]> {
  const role = session.user.role;
  const staff = role === Role.VERIFIER || role === Role.MANAGER || role === Role.ADMIN;

  const [unread, pending, fieldOpen] = await Promise.all([
    getUnreadCount(session.user.id),
    staff
      ? db.case.count({
          where: {
            status: { in: ["AWAITING_REVIEW", "IN_PROGRESS", "NEEDS_CORRECTION"] },
            ...(role === Role.VERIFIER ? { assignedVerifierId: session.user.id } : {}),
          },
        })
      : Promise.resolve(0),
    staff
      ? db.physicalVerification.count({ where: { status: { in: ["REQUESTED", "IN_PROGRESS"] } } })
      : Promise.resolve(0),
  ]);

  const notifications: SidebarNavItem = {
    section: "Account",
    href: "/notifications",
    label: "Notifications",
    icon: <Bell />,
    badge: unread > 0 ? unread : undefined,
  };

  if (role === Role.CANDIDATE) {
    return [
      { section: "Workspace", href: "/me", label: "Dashboard", icon: <Home /> },
      { section: "Workspace", href: "/me/documents", label: "Documents", icon: <FileText /> },
      { section: "Account", href: "/me/profile", label: "Profile", icon: <User /> },
      notifications,
    ];
  }

  const review: SidebarNavItem[] = [
    { section: "Review", href: "/work", label: "Queue", icon: <Inbox />, badge: pending > 0 ? pending : undefined },
    { section: "Review", href: "/work/all", label: "All cases", icon: <ListChecks /> },
    { section: "Review", href: "/work/physical", label: "Field visits", icon: <MapPinned />, badge: fieldOpen > 0 ? fieldOpen : undefined },
  ];
  const team: SidebarNavItem[] = [
    { section: "Team", href: "/team", label: "Overview", icon: <LayoutDashboard /> },
    { section: "Team", href: "/team/new", label: "New case", icon: <UserPlus /> },
    { section: "Team", href: "/team/reports", label: "Reports", icon: <FileBarChart2 /> },
  ];
  const system: SidebarNavItem[] = [
    { section: "System", href: "/admin", label: "Overview", icon: <Shield /> },
    { section: "System", href: "/admin/users", label: "Users", icon: <Users /> },
    { section: "System", href: "/admin/audit", label: "Audit log", icon: <Activity /> },
    { section: "System", href: "/admin/email-log", label: "Email log", icon: <Mail /> },
    { section: "System", href: "/admin/settings", label: "Settings", icon: <SlidersHorizontal /> },
  ];

  if (role === Role.VERIFIER) return [...review, notifications];
  if (role === Role.MANAGER) return [...review, ...team, notifications];
  return [...review, ...team, ...system, notifications]; // ADMIN
}

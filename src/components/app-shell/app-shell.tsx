import * as React from "react";
import type { AppSession } from "@/lib/auth";
import { AppShellProvider } from "./app-shell-context";
import { Sidebar, type SidebarNavItem } from "./sidebar";
import { Topbar } from "./topbar";

export type AppShellProps = {
  session: AppSession;
  nav: SidebarNavItem[];
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  session,
  nav,
  sidebarFooter,
  children,
}: AppShellProps) {
  return (
    <AppShellProvider>
      <div className="min-h-screen bg-muted/20">
        <Sidebar items={nav} footer={sidebarFooter} />
        <div className="flex min-h-screen flex-col md:pl-64">
          <Topbar session={session} />
          <main className="flex-1">
            <div className="container py-8">{children}</div>
          </main>
        </div>
      </div>
    </AppShellProvider>
  );
}

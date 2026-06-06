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
        {/* Keyboard users jump past the sidebar/topbar chrome (WCAG 2.4.1). */}
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
        >
          Skip to content
        </a>
        <Sidebar items={nav} footer={sidebarFooter} />
        <div className="flex min-h-screen flex-col md:pl-64">
          <Topbar session={session} />
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
            <div className="container py-8">{children}</div>
          </main>
        </div>
      </div>
    </AppShellProvider>
  );
}

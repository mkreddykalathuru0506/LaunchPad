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
      <div className="relative min-h-screen bg-background">
        {/* Atmospheric canvas: engineering dot grid + sky spotlight. */}
        <div aria-hidden className="dot-grid pointer-events-none fixed inset-0 opacity-50 [mask-image:radial-gradient(75%_60%_at_50%_0%,#000_20%,transparent_80%)]" />
        <div aria-hidden className="spotlight-top pointer-events-none fixed inset-x-0 top-0 h-[420px]" />

        {/* Keyboard users jump past the sidebar/topbar chrome (WCAG 2.4.1). */}
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
        >
          Skip to content
        </a>
        <Sidebar items={nav} footer={sidebarFooter} />
        {/* 256px floating rail + 12px inset on either side. */}
        <div className="relative flex min-h-screen flex-col md:pl-[17.5rem]">
          <Topbar session={session} />
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
            <div className="container py-8">{children}</div>
          </main>
        </div>
      </div>
    </AppShellProvider>
  );
}

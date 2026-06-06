"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { LifeBuoy, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { useAppShell } from "./app-shell-context";

export type SidebarNavItem = {
  section?: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
};

export type SidebarProps = {
  items: SidebarNavItem[];
  footer?: React.ReactNode;
};

type GroupedItems = { section: string | null; items: SidebarNavItem[] }[];

function groupItems(items: SidebarNavItem[]): GroupedItems {
  const groups: GroupedItems = [];
  let currentSection: string | null | undefined = undefined;
  for (const item of items) {
    const section = item.section ?? null;
    const last = groups[groups.length - 1];
    if (!last || currentSection !== section) {
      groups.push({ section, items: [item] });
      currentSection = section;
    } else {
      last.items.push(item);
    }
  }
  return groups;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarContent({
  items,
  footer,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const groups = React.useMemo(() => groupItems(items), [items]);

  return (
    <div className="relative flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(40% 30% at 10% 0%, hsl(201 96% 32% / 0.30), transparent 60%), radial-gradient(40% 40% at 100% 100%, hsl(199 89% 48% / 0.18), transparent 60%)",
        }}
      />
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Launch Pad home"
          className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/60 rounded-md"
        >
          <Logo forSidebar />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-6")}>
            {group.section && (
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
                {group.section}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href} className="relative">
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-sidebar-primary via-sidebar-primary to-sidebar-primary/60"
                      />
                    )}
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/60",
                        active
                          ? "bg-gradient-to-r from-sidebar-primary/15 via-sidebar-accent to-sidebar-accent text-white shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))]"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
                          active
                            ? "text-sidebar-primary"
                            : "text-sidebar-muted group-hover:text-white"
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge !== null && (
                        <Badge
                          tone={active ? "info" : "neutral"}
                          className={cn(
                            "ml-auto h-5 px-1.5 text-[10px] font-semibold",
                            // Sidebar-specific fills: the info tone's bg-accent is
                            // near-identical to the active row in dark, and neutral's
                            // bg-muted is wrong on permanent navy.
                            active
                              ? "bg-sidebar-primary/15 text-sidebar-primary ring-sidebar-primary/30"
                              : "bg-sidebar-accent text-sidebar-foreground/70 ring-sidebar-border"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Support card */}
      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary">
              <LifeBuoy className="h-4 w-4" />
            </span>
            <div className="text-sm font-medium text-white">Need a hand?</div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-sidebar-muted">
            Our verification team is on standby for any case-level questions.
          </p>
          <a
            href="mailto:bgv@elvixit.com"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-white hover:text-sidebar-primary"
          >
            <Mail className="h-3.5 w-3.5" />
            bgv@elvixit.com
          </a>
        </div>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Sidebar({ items, footer }: SidebarProps) {
  const { mobileOpen, setMobileOpen } = useAppShell();

  return (
    <>
      {/* Desktop */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border md:block"
        aria-label="Primary"
      >
        <SidebarContent items={items} footer={footer} />
      </aside>

      {/* Mobile slide-over */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in md:hidden" />
          <Dialog.Content
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 outline-none md:hidden",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
              "data-[state=open]:duration-200 data-[state=closed]:duration-150"
            )}
          >
            <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
            <Dialog.Description className="sr-only">
              Jump between workspace areas
            </Dialog.Description>
            <Dialog.Close
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
            <SidebarContent
              items={items}
              footer={footer}
              onNavigate={() => setMobileOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

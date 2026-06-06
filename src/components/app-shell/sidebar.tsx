"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { LifeBuoy, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
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

// ─── Light service-grid sidebar ──────────────────────────────────────────────
// Themed (light card surface; follows dark tokens in dark mode) with each
// section's destinations as a 2-column matrix of icon tiles — icon chip on
// top, service name underneath, unread counts as a corner pill.

function SidebarContent({
  items,
  footer,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const groups = React.useMemo(() => groupItems(items), [items]);

  return (
    <div className="flex h-full flex-col bg-card text-foreground">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-border/70 px-5">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Launch Pad home"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>
      </div>

      {/* Service grid */}
      <nav className="scroll-thin flex-1 overflow-y-auto px-4 py-5">
        {groups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-7")}>
            {group.section && (
              <div className="px-1 pb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {group.section}
              </div>
            )}
            <ul className="grid grid-cols-2 gap-2">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border text-center transition-all",
                        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-brand/40 bg-brand/10 shadow-sm"
                          : "border-transparent bg-muted/50 hover:-translate-y-0.5 hover:border-border hover:bg-accent hover:shadow-sm"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors [&>svg]:h-4 [&>svg]:w-4",
                          active
                            ? "bg-brand text-brand-foreground shadow-sm"
                            : "bg-card text-muted-foreground ring-1 ring-inset ring-border/80 group-hover:text-brand"
                        )}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={cn(
                          "line-clamp-2 px-1 text-[11px] font-medium leading-tight",
                          active ? "text-brand" : "text-foreground/80"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.badge !== undefined && item.badge !== null && (
                        <span className="tabnum absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[9px] font-bold text-brand-foreground">
                          {item.badge}
                        </span>
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
      <div className="border-t border-border/70 px-4 py-4">
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
              <LifeBuoy className="h-4 w-4" aria-hidden />
            </span>
            <div className="text-sm font-medium">Need a hand?</div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Our verification team is on standby for any case-level questions.
          </p>
          <a
            href="mailto:bgv@elvixit.com"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
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
      {/* Desktop — floating light rail */}
      <aside
        className="fixed bottom-3 left-3 top-3 z-30 hidden w-64 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl shadow-black/[0.06] md:block"
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
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
            <div className="h-full border-r border-border/70 bg-card shadow-2xl">
              <SidebarContent
                items={items}
                footer={footer}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

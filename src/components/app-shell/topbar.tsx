"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import {
  Bell,
  ChevronDown,
  CircleUser,
  CornerDownLeft,
  Loader2,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import { cn, initials, roleLabels } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppSession } from "@/lib/auth";
import { useAppShell } from "./app-shell-context";

type SearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  kind?: string;
};

type SearchResponse = {
  results?: SearchHit[];
};

type Notification = {
  id: string;
  title: string;
  body?: string;
  href?: string;
  createdAt?: string;
  read?: boolean;
};

type NotificationsResponse = {
  notifications?: Notification[];
  unread?: number;
};

function formatRelative(input?: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLFormElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Close on outside click
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced fetch
  React.useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data: SearchResponse = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/api/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  }

  return (
    <form
      ref={containerRef}
      onSubmit={onSubmit}
      className="relative hidden w-full max-w-md md:block"
      role="search"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          placeholder="Search cases, candidates, references…"
          className="h-9 pl-9 pr-9"
          aria-label="Search"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-slide-up">
          <div className="max-h-80 overflow-y-auto scroll-thin">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matches for{" "}
                <span className="font-medium text-foreground">
                  &ldquo;{query}&rdquo;
                </span>
              </div>
            )}
            {!loading && results.length > 0 && (
              <ul className="py-1">
                {results.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Search className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.title}</div>
                        {r.subtitle && (
                          <div className="truncate text-xs text-muted-foreground">
                            {r.subtitle}
                          </div>
                        )}
                      </div>
                      {r.kind && (
                        <Badge tone="neutral" className="ml-auto shrink-0">
                          {r.kind}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span>Tip — try a candidate name or case ID</span>
            <span className="inline-flex items-center gap-1">
              Enter <CornerDownLeft className="h-3 w-3" />
            </span>
          </div>
        </div>
      )}
    </form>
  );
}

function NotificationsBell() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [errored, setErrored] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErrored(false);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) {
        setErrored(true);
        setItems([]);
        setUnread(0);
        return;
      }
      const data: NotificationsResponse = await res.json();
      const list = Array.isArray(data.notifications)
        ? data.notifications.slice(0, 8)
        : [];
      setItems(list);
      setUnread(
        typeof data.unread === "number"
          ? data.unread
          : list.filter((n) => !n.read).length
      );
    } catch {
      setErrored(true);
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function markAllRead() {
    setUnread(0);
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/mark-read", { method: "POST" });
    } catch {
      // Optimistic — silent failure is fine.
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 flex h-2 w-2"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
          )}
          <span className="sr-only">
            {unread > 0 ? `${unread} unread notifications` : "Notifications"}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[22rem] overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-slide-up"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-[11px] text-muted-foreground">
                {unread > 0
                  ? `${unread} unread`
                  : "You're all caught up"}
              </div>
            </div>
            {items.length > 0 && unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto scroll-thin">
            {loading && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            )}
            {!loading && (errored || items.length === 0) && (
              <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="text-sm font-medium">No notifications yet</div>
                <div className="text-xs text-muted-foreground">
                  You&apos;ll see updates here when activity happens.
                </div>
              </div>
            )}
            {!loading && !errored && items.length > 0 && (
              <ul>
                {items.map((n) => {
                  const Wrapper: React.ElementType = n.href ? Link : "div";
                  const wrapperProps = n.href ? { href: n.href } : {};
                  return (
                    <li key={n.id}>
                      <Wrapper
                        {...wrapperProps}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-start gap-3 border-b border-border/60 px-4 py-3 text-sm last:border-b-0 hover:bg-accent",
                          !n.read && "bg-primary/[0.03]"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            n.read ? "bg-transparent" : "bg-primary"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="truncate font-medium">
                              {n.title}
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatRelative(n.createdAt)}
                            </span>
                          </div>
                          {n.body && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.body}
                            </p>
                          )}
                        </div>
                      </Wrapper>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border bg-muted/40">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-center text-xs font-medium text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function UserMenu({ session }: { session: AppSession }) {
  const name = session.user.name ?? session.user.email;
  const role = roleLabels[session.user.role];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-2.5 rounded-md p-1 pr-2 text-left transition-colors hover:bg-accent focus-ring"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground shadow-sm"
          >
            {initials(name)}
          </span>
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-sm font-medium">{name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {role}
            </span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 sm:block" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg animate-slide-up"
        >
          <div className="border-b border-border px-3 py-2.5">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {session.user.email}
            </div>
            <Badge tone="info" className="mt-2">
              {role}
            </Badge>
          </div>
          <DropdownMenu.Item asChild>
            <Link
              href="/me"
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus:bg-accent data-[highlighted]:bg-accent"
            >
              <CircleUser className="h-4 w-4 text-muted-foreground" />
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/me/settings"
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus:bg-accent data-[highlighted]:bg-accent"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              signOut({ callbackUrl: "/login" });
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-none focus:bg-destructive/10 data-[highlighted]:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Topbar({ session }: { session: AppSession }) {
  const { setMobileOpen } = useAppShell();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <SearchBox />

        <div className="ml-auto flex items-center gap-1.5">
          <NotificationsBell />
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <UserMenu session={session} />
        </div>
      </div>
    </header>
  );
}

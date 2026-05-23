import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "./user-menu";
import type { AppSession } from "@/lib/auth";

export function AppShell({
  session, nav, children,
}: {
  session: AppSession;
  nav: { href: string; label: string; icon?: React.ReactNode }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/"><Logo /></Link>
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <UserMenu session={session} />
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}

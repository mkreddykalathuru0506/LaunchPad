"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initials, roleLabels } from "@/lib/utils";
import type { AppSession } from "@/lib/auth";

export function UserMenu({ session }: { session: AppSession }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium">{session.user.name ?? session.user.email}</div>
        <div className="text-xs text-muted-foreground">{roleLabels[session.user.role]}</div>
      </div>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        aria-hidden
      >
        {initials(session.user.name ?? session.user.email)}
      </div>
      <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/login" })}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

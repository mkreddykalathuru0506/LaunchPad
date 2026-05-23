"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: string; title: string; description?: string; tone?: "success" | "danger" | "info" };
const ToastCtx = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg border bg-background p-3 shadow-lg animate-slide-up",
              t.tone === "success" && "border-success/30",
              t.tone === "danger" && "border-destructive/30",
              t.tone === "info" && "border-primary/30"
            )}
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.description && <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

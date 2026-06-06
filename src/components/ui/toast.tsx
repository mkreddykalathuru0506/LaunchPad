"use client";
import * as React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "danger" | "info";
type Toast = { id: string; title: string; description?: string; tone?: ToastTone };
const ToastCtx = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}

// Token-based tone styling. Icons make the status non-color-dependent (a11y);
// success/danger text tokens hold AA on the opaque card surface in both themes.
const toneBorder: Record<ToastTone, string> = {
  success: "border-success/30",
  danger: "border-destructive/30",
  info: "border-brand/30",
};
const toneIconColor: Record<ToastTone, string> = {
  success: "text-success",
  danger: "text-destructive",
  info: "text-brand",
};
function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  if (tone === "danger") return <AlertCircle className="h-4 w-4" aria-hidden="true" />;
  return <Info className="h-4 w-4" aria-hidden="true" />;
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
      {/* The CONTAINER is the persistent polite live region (exists from mount,
          so SRs reliably announce nodes added into it); error toasts carry
          role="alert" individually, which is the spec'd way to interrupt.
          Never steals focus. */}
      <div
        className="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const tone: ToastTone = t.tone ?? "info";
          return (
            <div
              key={t.id}
              role={tone === "danger" ? "alert" : undefined}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border bg-card text-card-foreground p-3 shadow-lg ring-1 ring-border/50 animate-slide-up",
                toneBorder[tone]
              )}
            >
              <span className={cn("mt-0.5 shrink-0", toneIconColor[tone])}>
                <ToneIcon tone={tone} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.description && <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "up" | "down" | "neutral";
type Accent = "primary" | "success" | "warning" | "info" | "neutral";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; tone: Tone };
  icon?: React.ReactNode;
  hint?: string;
  accent?: Accent;
  children?: React.ReactNode;
}

const accentGradient: Record<Accent, string> = {
  // "primary" accent renders in BRAND sky — the primary token inverts to
  // near-white in dark mode and would turn the rail/chip colorless.
  primary:
    "bg-gradient-to-b from-brand/80 via-brand to-brand/70",
  success:
    "bg-gradient-to-b from-success/70 via-success to-success/70",
  warning:
    "bg-gradient-to-b from-warning/70 via-warning to-warning/70",
  info: "bg-gradient-to-b from-[hsl(var(--info))]/70 via-[hsl(var(--info))] to-[hsl(var(--info))]/70",
  neutral:
    "bg-gradient-to-b from-border via-muted-foreground/40 to-border",
};

const accentIconBg: Record<Accent, string> = {
  primary:
    "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20",
  success:
    "bg-success/10 text-success ring-1 ring-inset ring-success/25",
  warning:
    "bg-warning/15 text-warning-foreground dark:text-warning ring-1 ring-inset ring-warning/35",
  info: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] ring-1 ring-inset ring-[hsl(var(--info))]/25",
  neutral:
    "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

const deltaTone: Record<Tone, string> = {
  up: "bg-success/10 text-success ring-1 ring-inset ring-success/25",
  down: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25",
  neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

function DeltaIcon({ tone }: { tone: Tone }) {
  if (tone === "up") return <TrendingUp className="h-3 w-3" aria-hidden="true" />;
  if (tone === "down") return <TrendingDown className="h-3 w-3" aria-hidden="true" />;
  return <Minus className="h-3 w-3" aria-hidden="true" />;
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  hint,
  accent = "primary",
  className,
  children,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm transition-all duration-200",
        "hover:-translate-y-px hover:shadow-md hover:scale-[1.005]",
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 w-1.5 rounded-r-full opacity-90",
          accentGradient[accent]
        )}
      />
      <div className="flex items-start justify-between gap-3 p-5 pl-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="tabnum text-3xl font-semibold leading-none tracking-tight text-foreground">
              {value}
            </div>
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabnum",
                  deltaTone[delta.tone]
                )}
              >
                <DeltaIcon tone={delta.tone} />
                {delta.value}
              </span>
            )}
          </div>
          {hint && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4",
              accentIconBg[accent]
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
      {children && <div className="px-5 pb-4 pl-6">{children}</div>}
    </div>
  );
}

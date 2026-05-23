import * as React from "react";
import { cn } from "@/lib/utils";

export type TimelineTone = "neutral" | "info" | "success" | "warn" | "danger";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  tone?: TimelineTone;
  icon?: React.ReactNode;
  current?: boolean;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[];
}

const dotTone: Record<TimelineTone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-accent text-accent-foreground ring-primary/30",
  success: "bg-success/15 text-success ring-success/30",
  warn: "bg-warning/15 text-warning-foreground ring-warning/40",
  danger: "bg-destructive/15 text-destructive ring-destructive/30",
};

const glowTone: Record<TimelineTone, string> = {
  neutral: "shadow-[0_0_0_4px_hsl(var(--muted-foreground)/.12)]",
  info: "shadow-[0_0_0_4px_hsl(var(--primary)/.18)]",
  success: "shadow-[0_0_0_4px_hsl(var(--success)/.18)]",
  warn: "shadow-[0_0_0_4px_hsl(var(--warning)/.22)]",
  danger: "shadow-[0_0_0_4px_hsl(var(--destructive)/.18)]",
};

export function Timeline({ items, className, ...props }: TimelineProps) {
  return (
    <ol className={cn("relative", className)} {...props}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const tone: TimelineTone = item.tone ?? "neutral";
        return (
          <li key={item.id} className="relative pb-6 pl-9 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-3 top-3 -ml-px h-[calc(100%-0.5rem)] w-px bg-border"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-inset",
                dotTone[tone],
                item.current && glowTone[tone]
              )}
            >
              {item.icon ? (
                <span className="[&>svg]:h-3 [&>svg]:w-3">{item.icon}</span>
              ) : (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    tone === "neutral" && "bg-muted-foreground/70",
                    tone === "info" && "bg-primary",
                    tone === "success" && "bg-success",
                    tone === "warn" && "bg-warning",
                    tone === "danger" && "bg-destructive"
                  )}
                />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p
                  className={cn(
                    "text-sm font-semibold leading-snug text-foreground",
                    item.current && "text-primary"
                  )}
                >
                  {item.title}
                </p>
                {item.timestamp && (
                  <time className="tabnum shrink-0 text-xs text-muted-foreground">
                    {item.timestamp}
                  </time>
                )}
              </div>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

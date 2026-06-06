import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

export interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  target?: string;
  caseRef?: string;
  at: Date | string;
}

export interface ActivityFeedProps extends React.HTMLAttributes<HTMLOListElement> {
  events: ActivityEvent[];
  emptyLabel?: string;
}

function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diff = Math.round((now - date.getTime()) / 1000);
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "ago" : "from now";

  const units: Array<[number, string]> = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];

  let value = abs;
  let unit = "s";
  for (const [factor, label] of units) {
    if (value < factor) {
      unit = label;
      break;
    }
    value = value / factor;
    unit = label;
  }
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  const formatted = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${formatted}${unit} ${sign}`;
}

export function ActivityFeed({
  events,
  emptyLabel = "No recent activity",
  className,
  ...props
}: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ol className={cn("flex flex-col", className)} {...props}>
      {events.map((e) => {
        const when = relativeTime(e.at);
        const fullDate =
          typeof e.at === "string"
            ? new Date(e.at).toLocaleString()
            : e.at.toLocaleString();
        return (
          <li
            key={e.id}
            className="group flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40"
          >
            <Avatar name={e.actor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-foreground">
                <span className="font-semibold">{e.actor}</span>{" "}
                <span className="text-muted-foreground">{e.action}</span>
                {e.target && (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">{e.target}</span>
                  </>
                )}
                {e.caseRef && (
                  <>
                    {" "}
                    <span className="text-muted-foreground">on</span>{" "}
                    <span className="tabnum font-mono text-xs font-medium text-brand">
                      {e.caseRef}
                    </span>
                  </>
                )}
                <span className="mx-1.5 text-muted-foreground/50" aria-hidden="true">
                  ·
                </span>
                <time
                  dateTime={
                    typeof e.at === "string" ? e.at : e.at.toISOString()
                  }
                  title={fullDate}
                  className="tabnum text-xs text-muted-foreground"
                >
                  {when}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

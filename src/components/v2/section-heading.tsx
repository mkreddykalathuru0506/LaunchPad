import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
  as = "h2",
  className,
  ...props
}: SectionHeadingProps) {
  const Heading = as;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-brand">
            <span
              aria-hidden="true"
              className="inline-block h-1 w-1 rounded-full bg-brand"
            />
            {eyebrow}
          </div>
        )}
        <Heading
          className={cn(
            "truncate font-display text-2xl font-bold tracking-tight text-foreground",
            as === "h1" && "text-3xl sm:text-4xl"
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 sm:pb-1">{actions}</div>
      )}
    </div>
  );
}

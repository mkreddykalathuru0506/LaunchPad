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
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span
              aria-hidden="true"
              className="inline-block h-1 w-1 rounded-full bg-primary"
            />
            {eyebrow}
          </div>
        )}
        <Heading
          className={cn(
            "truncate text-2xl font-semibold tracking-tight text-foreground",
            as === "h1" && "text-3xl"
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

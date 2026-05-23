import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/30 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-inset ring-primary/15 text-primary"
        >
          <span className="[&>svg]:h-6 [&>svg]:w-6">{icon}</span>
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

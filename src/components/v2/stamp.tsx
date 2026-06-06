import { cn } from "@/lib/utils";

type StampTone = "success" | "brand" | "warning" | "danger" | "neutral";

const toneCls: Record<StampTone, string> = {
  success: "text-success border-success/70 outline-success/30",
  brand: "text-brand border-brand/70 outline-brand/30",
  warning: "text-warning-foreground border-warning/80 outline-warning/40 dark:text-warning",
  danger: "text-destructive border-destructive/70 outline-destructive/30",
  neutral: "text-muted-foreground border-muted-foreground/50 outline-muted-foreground/25",
};

/**
 * Passport entry-stamp status mark — mono, uppercase, double-ruled frame,
 * optionally tilted like a real hand stamp. For the big "moment" statuses
 * (CLEARED, APPROVED, AWAITING REVIEW); use Badge for dense lists.
 */
export function Stamp({
  children,
  tone = "success",
  tilt = false,
  className,
}: {
  children: React.ReactNode;
  tone?: StampTone;
  tilt?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stamp-frame inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em]",
        toneCls[tone],
        tilt && "-rotate-3",
        className
      )}
    >
      {children}
    </span>
  );
}

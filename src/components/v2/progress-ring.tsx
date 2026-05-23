import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  accent?: string;
  showValue?: boolean;
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  label,
  accent = "hsl(var(--primary))",
  showValue = true,
  className,
  ...props
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${Math.round(clamped)}%`}
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 480ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        {showValue && (
          <span
            className="tabnum font-semibold text-foreground"
            style={{ fontSize: Math.max(11, size * 0.22) }}
          >
            {Math.round(clamped)}
            <span className="text-muted-foreground">%</span>
          </span>
        )}
        {label && (
          <span
            className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            style={{ maxWidth: size - stroke * 2 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

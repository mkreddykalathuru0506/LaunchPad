import * as React from "react";
import { cn } from "@/lib/utils";

export interface MiniBarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: number[];
  height?: number;
  accent?: string;
  ariaLabel?: string;
}

export function MiniBarChart({
  data,
  height = 36,
  accent = "hsl(var(--primary))",
  ariaLabel,
  className,
  ...props
}: MiniBarChartProps) {
  // Hooks must be called unconditionally — keep above the empty-data
  // early return so React's render order stays consistent.
  const uid = React.useId();
  const gradId = `mbc-grad-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const gradLastId = `${gradId}-last`;

  if (data.length === 0) {
    return (
      <div
        className={cn("w-full", className)}
        style={{ height }}
        aria-hidden="true"
        {...props}
      />
    );
  }

  const max = Math.max(...data, 1);
  const gap = 2;
  const totalGap = gap * (data.length - 1);
  const viewWidth = 100;
  const barWidth = (viewWidth - totalGap) / data.length;
  const radius = Math.min(barWidth / 2, 1.4);
  const minHeightFraction = 0.06;

  return (
    <div
      className={cn("w-full", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      {...props}
    >
      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.85" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={gradLastId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="1" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {data.map((raw, i) => {
          const v = Math.max(0, raw);
          const ratio = Math.max(minHeightFraction, v / max);
          const h = ratio * height;
          const x = i * (barWidth + gap);
          const y = height - h;
          const isLast = i === data.length - 1;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={radius}
              ry={radius}
              fill={`url(#${isLast ? gradLastId : gradId})`}
            />
          );
        })}
      </svg>
    </div>
  );
}

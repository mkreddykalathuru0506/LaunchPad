import * as React from "react";
import { cn, initials } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";
type AvatarTone = "primary" | "neutral" | "success" | "warn" | "danger";

const sizeMap: Record<AvatarSize, string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

const toneMap: Record<AvatarTone, string> = {
  primary:
    "bg-gradient-to-br from-primary/20 to-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  neutral:
    "bg-gradient-to-br from-muted to-muted/60 text-muted-foreground ring-1 ring-inset ring-border",
  success:
    "bg-gradient-to-br from-success/20 to-success/10 text-success ring-1 ring-inset ring-success/25",
  warn: "bg-gradient-to-br from-warning/25 to-warning/10 text-warning-foreground dark:text-warning ring-1 ring-inset ring-warning/40",
  danger:
    "bg-gradient-to-br from-destructive/20 to-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25",
};

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string | null;
  src?: string | null;
  size?: AvatarSize;
  tone?: AvatarTone;
  alt?: string;
}

function pickTone(name?: string | null): AvatarTone {
  if (!name) return "neutral";
  const tones: AvatarTone[] = ["primary", "success", "warn", "danger", "neutral"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return tones[h % tones.length] ?? "neutral";
}

export function Avatar({
  name,
  src,
  size = "md",
  tone,
  alt,
  className,
  ...props
}: AvatarProps) {
  const finalTone: AvatarTone = tone ?? pickTone(name);
  const label = alt ?? name ?? "Avatar";
  const sizeClasses = sizeMap[size];

  if (src) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-border",
          sizeClasses,
          className
        )}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight",
        sizeClasses,
        toneMap[finalTone],
        className
      )}
      {...props}
    >
      {initials(name)}
    </span>
  );
}

export interface AvatarStackEntry {
  name?: string | null;
  src?: string | null;
  tone?: AvatarTone;
}

export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  people: AvatarStackEntry[];
  size?: AvatarSize;
  max?: number;
}

export function AvatarStack({
  people,
  size = "md",
  max = 3,
  className,
  ...props
}: AvatarStackProps) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  const ringSize: Record<AvatarSize, string> = {
    sm: "ring-2",
    md: "ring-2",
    lg: "ring-[3px]",
  };
  const pillSize: Record<AvatarSize, string> = {
    sm: "h-6 px-1.5 text-[10px]",
    md: "h-9 px-2 text-xs",
    lg: "h-12 px-2.5 text-sm",
  };

  return (
    <div className={cn("flex items-center -space-x-2", className)} {...props}>
      {visible.map((p, i) => (
        <Avatar
          key={i}
          name={p.name}
          src={p.src}
          tone={p.tone}
          size={size}
          className={cn("ring-background", ringSize[size])}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-background",
            ringSize[size],
            pillSize[size]
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

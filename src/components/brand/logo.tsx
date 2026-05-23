import { Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  withWordmark = true,
  forSidebar = false,
}: {
  className?: string;
  withWordmark?: boolean;
  forSidebar?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Rocket className="h-5 w-5" />
      </span>
      {withWordmark && (
        <div className="leading-tight">
          <div
            className={cn(
              "text-base font-semibold tracking-tight",
              forSidebar && "text-white"
            )}
          >
            Launch Pad
          </div>
          <div
            className={cn(
              "text-[10px] uppercase tracking-[0.18em]",
              forSidebar ? "text-white/60" : "text-muted-foreground"
            )}
          >
            ElivixIT · Background Verification
          </div>
        </div>
      )}
    </div>
  );
}

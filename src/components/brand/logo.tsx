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
      {/* On permanently-navy surfaces (sidebar, login panel) the navy primary
          chip would vanish in light mode — use the sky sidebar accent there. */}
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg shadow-sm",
          forSidebar ? "bg-sidebar-primary text-sidebar" : "bg-primary text-primary-foreground"
        )}
      >
        <Rocket className="h-5 w-5" aria-hidden />
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
              "text-[11px] font-medium tracking-wide",
              forSidebar ? "text-white/70" : "text-muted-foreground"
            )}
          >
            ElvixIT · Background Verification
          </div>
        </div>
      )}
    </div>
  );
}

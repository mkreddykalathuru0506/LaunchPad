import Image from "next/image";
import { cn } from "@/lib/utils";
import logoMark from "../../../public/logo.png";

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
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* The mark already carries the "ELVIXIT" wordmark inside the artwork,
          so the company name is never repeated as adjacent text. The label
          beside it is the PRODUCT name (Launch Pad) only. */}
      <Image
        src={logoMark}
        alt="ElvixIT"
        width={36}
        height={36}
        priority
        className="h-9 w-9 shrink-0 object-contain"
      />
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
            Background Verification
          </div>
        </div>
      )}
    </div>
  );
}

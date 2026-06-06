"use client";
import * as React from "react";
import {
  Fingerprint, MapPin, GraduationCap, Briefcase, FileSearch, Camera, Video, Medal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Animated verification pipeline ─────────────────────────────────────────
// A marching dashed spine with a traveling pulse; the eight stages alternate
// sides on desktop and reveal as they scroll into view. No-JS / reduced-motion
// degrade to a plain, fully visible list (see globals.css [data-animate]).

const STEPS = [
  { icon: Fingerprint, title: "Identity", blurb: "Government-issued ID with biometric match against a live selfie.", tag: "ID + BIOMETRIC" },
  { icon: MapPin, title: "Address", blurb: "Current and permanent address, backed by utility-grade proof.", tag: "PROOF OF RESIDENCE" },
  { icon: GraduationCap, title: "Education", blurb: "SSC, Intermediate, and Degree records verified with institutions.", tag: "REGISTRAR OUTREACH" },
  { icon: Briefcase, title: "Employment", blurb: "Work history confirmed directly with previous employers' HR.", tag: "HR CONFIRMED" },
  { icon: FileSearch, title: "Criminal", blurb: "Multi-jurisdiction record search with FCRA/DPDP consent capture.", tag: "CONSENT RECORDED" },
  { icon: Camera, title: "Photo", blurb: "Liveness-checked selfie, face-matched to the submitted ID.", tag: "LIVENESS CHECK" },
  { icon: Video, title: "Video", blurb: "Recorded prompt-phrase capture for human-verifiable identity.", tag: "PROMPT PHRASE" },
  { icon: Medal, title: "Veteran Status", blurb: "Optional, USERRA-compliant service verification when claimed.", tag: "OPTIONAL STAGE" },
] as const;

export function WorkflowPipeline() {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Arm the reveal styles only once JS is live (no-JS users see everything).
    root.setAttribute("data-animate", "");
    const steps = Array.from(root.querySelectorAll<HTMLElement>(".pipeline-step"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-inview");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="relative mx-auto mt-16 max-w-4xl">
      {/* Spine + traveling pulse */}
      <div aria-hidden className="absolute bottom-4 left-5 top-4 w-px lg:left-1/2 lg:-translate-x-1/2">
        <div className="pipeline-spine absolute inset-0 w-px" />
        <span className="pipeline-pulse absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_14px_4px_hsl(var(--brand)/0.45)]" />
      </div>

      <ol className="space-y-10 lg:space-y-12">
        {STEPS.map(({ icon: Icon, title, blurb, tag }, i) => {
          const right = i % 2 === 1; // card sits right of the spine on desktop
          return (
            <li
              key={title}
              className="pipeline-step relative pl-16 lg:pl-0"
              style={{ transitionDelay: `${(i % 2) * 90}ms` }}
            >
              {/* Numbered node on the spine */}
              <span
                aria-hidden
                className="absolute left-5 top-2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-xl border border-brand/40 bg-background font-mono text-[11px] font-bold text-brand shadow-md shadow-brand/10 lg:left-1/2"
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div
                className={cn(
                  "group rounded-2xl border bg-card p-5 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5",
                  "lg:w-[calc(50%-3.5rem)]",
                  right ? "lg:ml-auto" : "lg:mr-auto"
                )}
              >
                <div className={cn("flex items-center gap-3", !right && "lg:flex-row-reverse")}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/20 transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className={cn("min-w-0 flex-1", !right && "lg:text-right")}>
                    <div className="font-display text-lg font-semibold">{title}</div>
                    <div className="font-mono text-[9px] font-semibold tracking-[0.22em] text-brand/80">
                      STAGE {String(i + 1).padStart(2, "0")} · {tag}
                    </div>
                  </div>
                </div>
                <p className={cn("mt-3 text-sm leading-relaxed text-muted-foreground", !right && "lg:text-right")}>
                  {blurb}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

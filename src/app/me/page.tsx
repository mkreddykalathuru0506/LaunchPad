import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { Timeline, type TimelineItem } from "@/components/v2/timeline";
import { EmptyState } from "@/components/v2/empty-state";
import { Stamp } from "@/components/v2/stamp";
import { StageStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { stageLabels, stageBlurbs, progressPercent, formatDateTime } from "@/lib/utils";
import { requiredStagesForCase } from "@/lib/stages";
import {
  ArrowRight, ShieldAlert, Fingerprint, MapPin, GraduationCap, Briefcase,
  FileSearch, Medal, Camera, Video, Inbox, ClipboardCheck, FileText, Clock, Send,
} from "lucide-react";
import { StageType, StageStatus, CaseStatus } from "@prisma/client";
import { FlowFeedback } from "@/components/stage/flow-feedback";

// REFERENCE is intentionally omitted — the reference stage is retired.
const stageIcon: Partial<Record<StageType, React.ReactNode>> = {
  IDENTITY: <Fingerprint />,
  ADDRESS: <MapPin />,
  EDUCATION: <GraduationCap />,
  EMPLOYMENT: <Briefcase />,
  CRIMINAL: <FileSearch />,
  VETERAN: <Medal />,
  PHOTO: <Camera />,
  VIDEO: <Video />,
};

const stageRoute: Partial<Record<StageType, string>> = {
  IDENTITY: "/me/stage/identity",
  ADDRESS: "/me/stage/address",
  EDUCATION: "/me/stage/education",
  EMPLOYMENT: "/me/stage/employment",
  CRIMINAL: "/me/stage/criminal",
  VETERAN: "/me/stage/veteran",
  PHOTO: "/me/stage/photo",
  VIDEO: "/me/stage/video",
};

const DONE: StageStatus[] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];

function timelineTone(s: StageStatus): TimelineItem["tone"] {
  if (s === "APPROVED") return "success";
  if (s === "REJECTED") return "danger";
  if (s === "NEEDS_CORRECTION") return "warn";
  if (s === "SUBMITTED" || s === "UNDER_REVIEW" || s === "IN_PROGRESS") return "info";
  return "neutral";
}

const caseStampTone: Record<CaseStatus, "success" | "brand" | "warning" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  IN_PROGRESS: "brand",
  AWAITING_REVIEW: "brand",
  NEEDS_CORRECTION: "warning",
  CLEARED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
};

// Journey node styling per stage state.
function nodeCls(s: StageStatus): string {
  switch (s) {
    case "APPROVED":
      return "bg-success text-white ring-success/40";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "bg-brand/15 text-brand ring-brand/40";
    case "NEEDS_CORRECTION":
      return "bg-warning/20 text-warning-foreground ring-warning/50 dark:text-warning";
    case "REJECTED":
      return "bg-destructive/15 text-destructive ring-destructive/40";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

/** Passport-style machine-readable line for the hero card. Decorative. */
function mrzFor(reference: string, name: string, status: CaseStatus): string {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "<");
  const line = `${clean(reference)}<<${clean(name)}<<BGV<${clean(status)}`;
  return (line + "<".repeat(64)).slice(0, 64);
}

export default async function CandidateDashboard({
  searchParams,
}: {
  searchParams?: { submitted?: string };
}) {
  const session = await requireRole("CANDIDATE");

  // Force temp-password rotation before showing the dashboard.
  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (u?.mustChangePassword) {
    const { redirect } = await import("next/navigation");
    redirect("/me/change-password");
  }

  const cand = await getCaseForCandidate(session.user.id);

  if (!cand?.case) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="No active case yet"
        description="Your hiring manager hasn't started your background verification. Check your email for an invitation or reach out to your point of contact."
      />
    );
  }

  const kase = cand.case;
  // Journey order = the case's provisioned required set; stray rows excluded.
  const required = requiredStagesForCase(kase, kase.stages).filter((t) => stageRoute[t]);
  const byType = new Map(kase.stages.map((s) => [s.type, s]));
  const statuses = required.map((t) => byType.get(t)?.status ?? "NOT_STARTED");
  const approved = statuses.filter((s) => s === "APPROVED").length;
  const pending = statuses.filter((s) => s === "SUBMITTED" || s === "UNDER_REVIEW").length;
  const corrections = required.filter((t) => byType.get(t)?.status === "NEEDS_CORRECTION");
  const percent = progressPercent(statuses);
  const allSubmitted = statuses.every((s) => DONE.includes(s));
  const nextStage = required.find((t) => !DONE.includes(byType.get(t)?.status ?? "NOT_STARTED"));

  const docCount = await db.document.count({ where: { caseId: kase.id } });
  const daysActive = Math.max(1, Math.ceil((Date.now() - kase.createdAt.getTime()) / 86_400_000));

  const reviewEvents = await db.stageReview.findMany({
    where: { stage: { caseId: kase.id } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { stage: true, reviewer: true },
  });

  const fullName = cand.user.name ?? cand.user.email;
  const firstName = cand.legalFirstName ?? fullName.split(" ")[0] ?? "candidate";

  // Hero progress ring geometry.
  const R = 44;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-8">
      {searchParams?.submitted === "1" && (
        <FlowFeedback success="Thanks! Your profile has been sent to the BGV team. You'll be notified as it's reviewed." />
      )}

      {/* ── Case-file hero — fixed navy, both themes ─────────────────────── */}
      <section className="panel-navy relative overflow-hidden rounded-3xl border border-sidebar-border/60 shadow-xl shadow-primary/10">
        <div aria-hidden className="dot-grid-light absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_80%_at_30%_0%,#000,transparent)]" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300/90">
                Case {kase.reference}
              </span>
              <Stamp tone={caseStampTone[kase.status]} className="bg-slate-950/30">
                {kase.status.replace(/_/g, " ")}
              </Stamp>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {cand.positionTitle ?? "Onboarding"} · Start date{" "}
              {cand.startDate ? new Date(cand.startDate).toLocaleDateString() : "TBD"}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {allSubmitted ? (
                <Button variant="brand" asChild>
                  <Link href="/me/review">
                    <Send className="h-4 w-4" aria-hidden /> Review &amp; submit profile
                  </Link>
                </Button>
              ) : nextStage ? (
                <Button variant="brand" asChild>
                  <Link href={stageRoute[nextStage]!}>
                    Continue: {stageLabels[nextStage]} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="/me/review">
                  <ClipboardCheck className="h-4 w-4" aria-hidden /> Review profile
                </Link>
              </Button>
            </div>
          </div>

          {/* Progress ring */}
          <div className="flex items-center gap-5 lg:flex-col lg:gap-2 lg:text-center">
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Verification progress: ${percent}% approved`}
              className="relative h-[120px] w-[120px]"
            >
              <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
                <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
                <circle
                  cx="56" cy="56" r={R} fill="none"
                  stroke="hsl(199 89% 57%)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C - (C * percent) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display text-2xl font-bold text-white">{percent}%</div>
              </div>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
              {approved}/{required.length} stages approved
            </div>
          </div>
        </div>
        {/* MRZ footer */}
        <div className="relative border-t border-dashed border-white/15 px-6 py-2.5 sm:px-8">
          <div aria-hidden className="mrz text-[10px] text-slate-500">
            {mrzFor(kase.reference, fullName, kase.status)}
          </div>
        </div>
      </section>

      {/* ── Corrections callout ─────────────────────────────────────────── */}
      {corrections.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/20">
            <ShieldAlert className="h-5 w-5 text-warning-foreground dark:text-warning" aria-hidden />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {corrections.length} stage{corrections.length > 1 ? "s need" : " needs"} your attention
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {corrections.map((t) => stageLabels[t]).join(", ")} — review the feedback and resubmit.
            </p>
          </div>
          <Button asChild size="sm" variant="warning">
            <Link href={stageRoute[corrections[0]!]!}>
              Fix now <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      )}

      {/* ── Journey + side rail ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,340px)]">
        {/* Verification journey */}
        <section aria-labelledby="journey-heading" className="rounded-2xl border bg-card/80 backdrop-blur">
          <div className="flex items-baseline justify-between gap-3 border-b px-5 py-4 sm:px-6">
            <div>
              <h2 id="journey-heading" className="font-display text-lg font-semibold">
                Verification journey
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Complete each checkpoint — every stage is reviewed independently.
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {approved}/{required.length} done
            </span>
          </div>
          <ol className="px-3 py-3 sm:px-4">
            {required.map((type, i) => {
              const stage = byType.get(type);
              const status: StageStatus = stage?.status ?? "NOT_STARTED";
              const isCurrent = type === nextStage;
              const isLast = i === required.length - 1;
              return (
                <li key={type} className="relative">
                  {/* connector */}
                  {!isLast && (
                    <span aria-hidden className="absolute bottom-0 left-[2.45rem] top-12 w-px bg-border" />
                  )}
                  <Link
                    href={stageRoute[type]!}
                    className={`group relative flex items-center gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-accent ${
                      isCurrent ? "bg-brand/5 ring-1 ring-inset ring-brand/30" : ""
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset [&>svg]:h-5 [&>svg]:w-5 ${nodeCls(status)}`}
                      aria-hidden
                    >
                      {stageIcon[type]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-semibold">{stageLabels[type]}</span>
                        {isCurrent && (
                          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-brand">
                            ← next up
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {stageBlurbs[type]}
                      </span>
                    </span>
                    <StageStatusBadge status={status} />
                    <ArrowRight
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Side rail */}
        <div className="space-y-6">
          {/* Compact stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "In review", value: pending, icon: <Clock /> },
              { label: "Corrections", value: corrections.length, icon: <ShieldAlert /> },
              { label: "Documents", value: docCount, icon: <FileText /> },
              { label: "Days active", value: daysActive, icon: <ClipboardCheck /> },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border bg-card/80 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    {s.label}
                  </span>
                  <span aria-hidden className="text-brand [&>svg]:h-3.5 [&>svg]:w-3.5">{s.icon}</span>
                </div>
                <div className="tabnum mt-2 font-display text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <section aria-labelledby="activity-heading" className="rounded-2xl border bg-card/80 backdrop-blur">
            <div className="border-b px-5 py-4">
              <h2 id="activity-heading" className="font-display text-lg font-semibold">Recent activity</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Latest updates on your case</p>
            </div>
            <div className="p-5">
              {reviewEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Submit a stage to start the verification journey.
                </div>
              ) : (
                <Timeline
                  items={reviewEvents.slice(0, 6).map((r, idx) => ({
                    id: r.id,
                    title: `${stageLabels[r.stage.type]} ${r.decision === "APPROVED" ? "approved" : r.decision === "REJECTED" ? "rejected" : "correction requested"}`,
                    description: r.comment ?? undefined,
                    timestamp: formatDateTime(r.createdAt),
                    tone: timelineTone(r.decision),
                    current: idx === 0,
                  }))}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

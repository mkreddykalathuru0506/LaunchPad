import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { SectionHeading } from "@/components/v2/section-heading";
import { StatCard } from "@/components/v2/stat-card";
import { ProgressRing } from "@/components/v2/progress-ring";
import { Timeline, type TimelineItem } from "@/components/v2/timeline";
import { EmptyState } from "@/components/v2/empty-state";
import { CardElev, CardElevBody, CardElevHeader, CardElevTitle, CardElevDescription } from "@/components/v2/card-elev";
import { CaseStatusBadge, StageStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { stageLabels, stageBlurbs, progressPercent, formatDateTime } from "@/lib/utils";
import { requiredStagesForCase } from "@/lib/stages";
import {
  ArrowRight, ShieldAlert, Fingerprint, MapPin, GraduationCap, Briefcase,
  FileSearch, Medal, Camera, Video, Inbox, CheckCircle2, Clock, Sparkles, ClipboardCheck,
} from "lucide-react";
import { StageType, StageStatus } from "@prisma/client";
import { FlowFeedback } from "@/components/stage/flow-feedback";

// REFERENCE is intentionally omitted — the reference stage is retired (kept in
// the Prisma enum only). These maps are keyed by the *active* stage types, so a
// Partial keeps TS happy without forcing a dead REFERENCE entry.
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

function timelineTone(s: StageStatus): TimelineItem["tone"] {
  if (s === "APPROVED") return "success";
  if (s === "REJECTED") return "danger";
  if (s === "NEEDS_CORRECTION") return "warn";
  if (s === "SUBMITTED" || s === "UNDER_REVIEW" || s === "IN_PROGRESS") return "info";
  return "neutral";
}

export default async function CandidateDashboard({
  searchParams,
}: {
  searchParams?: { submitted?: string };
}) {
  const session = await requireRole("CANDIDATE");

  // Force temp-password rotation before showing the dashboard. The
  // change-password page is itself under /me/ but renders OUTSIDE this gate
  // because that page calls requireRole() but does its own logic.
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
  // Only render stages in the case's required set (stray rows — retired
  // REFERENCE, or leftovers from a candidate-type change — would distort the
  // progress math) that also have an active route.
  const required = requiredStagesForCase(kase, kase.stages);
  const stages = kase.stages.filter((s) => required.includes(s.type) && stageRoute[s.type]);
  const approved = stages.filter((s) => s.status === "APPROVED").length;
  const pending = stages.filter((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW").length;
  const corrections = stages.filter((s) => s.status === "NEEDS_CORRECTION");
  const remaining = stages.filter((s) => s.status === "NOT_STARTED" || s.status === "IN_PROGRESS").length;
  const percent = progressPercent(stages.map((s) => s.status));

  const docCount = await db.document.count({ where: { caseId: kase.id } });

  // Reviews on submitted stages for timeline
  const reviewEvents = await db.stageReview.findMany({
    where: { stage: { caseId: kase.id } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { stage: true, reviewer: true },
  });

  const firstName = cand.legalFirstName ?? cand.user.name?.split(" ")[0] ?? "candidate";

  return (
    <div className="space-y-8">
      {searchParams?.submitted === "1" && (
        <FlowFeedback success="Thanks! Your profile has been sent to the BGV team. You'll be notified as it's reviewed." />
      )}

      <SectionHeading
        as="h1"
        eyebrow={`Case ${kase.reference}`}
        title={`Welcome back, ${firstName}`}
        description={`${cand.positionTitle ?? "Onboarding"} · Start date ${cand.startDate ? new Date(cand.startDate).toLocaleDateString() : "TBD"}`}
        actions={
          <div className="flex items-center gap-2">
            <CaseStatusBadge status={kase.status} />
            <Button asChild size="sm">
              <Link href="/me/review">
                <ClipboardCheck className="h-3.5 w-3.5" /> Review &amp; submit
              </Link>
            </Button>
          </div>
        }
      />

      {corrections.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/20">
            <ShieldAlert className="h-5 w-5 text-warning-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {corrections.length} stage{corrections.length > 1 ? "s need" : " needs"} your attention
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {corrections.map((c) => stageLabels[c.type]).join(", ")} — review the feedback and resubmit.
            </p>
          </div>
          <Button asChild size="sm" variant="warning">
            <Link href={stageRoute[corrections[0]!.type]!}>
              Fix now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Progress"
          value={`${percent}%`}
          accent="primary"
          icon={<Sparkles />}
          hint={`${approved} of ${stages.length} stages approved`}
        />
        <StatCard
          label="In review"
          value={pending}
          accent="info"
          icon={<Clock />}
          hint="Submitted, awaiting verifier decision"
        />
        <StatCard
          label="Need correction"
          value={corrections.length}
          accent={corrections.length > 0 ? "warning" : "neutral"}
          icon={<ShieldAlert />}
          hint={corrections.length > 0 ? "Action needed from you" : "All clear right now"}
        />
        <StatCard
          label="Documents"
          value={docCount}
          accent="neutral"
          icon={<FileSearch />}
          hint="Uploaded to your case"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stages card grid */}
        <div className="space-y-4 lg:col-span-2">
          <SectionHeading
            as="h2"
            title="Verification stages"
            description="Click any stage to continue. Each stage is reviewed independently."
            actions={
              <div className="hidden items-center gap-2 sm:flex">
                <ProgressRing value={percent} size={48} stroke={5} label={`${percent}%`} />
                <div className="text-xs text-muted-foreground">
                  {approved}/{stages.length} complete
                </div>
              </div>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {stages.map((s) => {
              const isCorrection = s.status === "NEEDS_CORRECTION";
              const isApproved = s.status === "APPROVED";
              const isPending = s.status === "SUBMITTED" || s.status === "UNDER_REVIEW";
              return (
                <Link
                  key={s.id}
                  href={stageRoute[s.type]!}
                  className={`group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:-translate-y-px hover:shadow-md ${
                    isCorrection ? "border-warning/50 ring-1 ring-warning/30" : "border-border/70 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset [&>svg]:h-5 [&>svg]:w-5 ${
                        isApproved
                          ? "bg-success/10 text-success ring-success/25"
                          : isCorrection
                          ? "bg-warning/15 text-warning-foreground ring-warning/35"
                          : isPending
                          ? "bg-primary/10 text-primary ring-primary/25"
                          : "bg-muted text-muted-foreground ring-border"
                      }`}
                    >
                      {stageIcon[s.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold">{stageLabels[s.type]}</div>
                        {isApproved && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{stageBlurbs[s.type]}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <StageStatusBadge status={s.status} />
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Activity timeline */}
        <CardElev>
          <CardElevHeader>
            <CardElevTitle>Recent activity</CardElevTitle>
            <CardElevDescription>Latest updates on your case</CardElevDescription>
          </CardElevHeader>
          <CardElevBody>
            {reviewEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
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
          </CardElevBody>
        </CardElev>
      </div>
    </div>
  );
}

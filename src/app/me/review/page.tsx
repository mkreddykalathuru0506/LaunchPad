import Link from "next/link";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { getCaseForCandidate } from "@/server/queries/case";
import { submitProfileForBgv } from "@/server/actions/stage";
import { requiredStagesForCase } from "@/lib/stages";
import { stageLabels, formatDate } from "@/lib/utils";
import { SectionHeading } from "@/components/v2/section-heading";
import {
  CardElev, CardElevBody, CardElevHeader, CardElevTitle, CardElevDescription,
} from "@/components/v2/card-elev";
import { StageStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/v2/empty-state";
import { FlowFeedback } from "@/components/stage/flow-feedback";
import { ArrowLeft, Inbox, Pencil, CheckCircle2, Send, AlertTriangle } from "lucide-react";
import type { StageType, StageStatus } from "@prisma/client";

/** A stage counts as "done" once the candidate has submitted it (or beyond). */
const DONE: StageStatus[] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];

export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: { err?: string };
}) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);

  if (!cand?.case) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="No active case yet"
        description="Your background verification hasn't started. Check your email for an invitation or reach out to your point of contact."
      />
    );
  }

  const kase = cand.case;
  // The case's provisioned required set — NOT re-derived from candidateType,
  // which disagrees for portal cases with a custom requiredStages list (and
  // would disable the submit button on stages that were never provisioned).
  const required = requiredStagesForCase(kase, kase.stages);
  const byType = new Map(kase.stages.map((s) => [s.type, s]));
  const incomplete = required.filter((t) => !DONE.includes(byType.get(t)?.status ?? "NOT_STARTED"));
  const allDone = incomplete.length === 0;

  // The consolidated hand-off email doubles as the "already submitted" flag
  // (same check the action uses; "sent" only — a failed attempt must not
  // disable retrying) — once handed off, corrections re-enter review
  // automatically on stage resubmit; the button stays disabled.
  const alreadySubmitted = !!(await db.emailLog.findFirst({
    where: { caseId: kase.id, templateId: "profile.submitted.bgv", status: "sent" },
    select: { id: true },
  }));

  return (
    <div className="space-y-8">
      {searchParams?.err && <FlowFeedback error={searchParams.err} />}

      <SectionHeading
        as="h1"
        eyebrow={`Case ${kase.reference}`}
        title="Review & submit your profile"
        description="Check everything below, edit any stage if needed, then submit your profile to the BGV team."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/me">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
            </Link>
          </Button>
        }
      />

      {!allDone && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/20">
            <AlertTriangle className="h-5 w-5 text-warning-foreground" />
          </div>
          <div className="flex-1 text-sm">
            <div className="font-semibold">
              {incomplete.length} stage{incomplete.length > 1 ? "s" : ""} still need{incomplete.length > 1 ? "" : "s"} to be submitted
            </div>
            <p className="mt-0.5 text-muted-foreground">
              {incomplete.map((t) => stageLabels[t]).join(", ")} — open each from the cards below and submit it before sending your profile for BGV.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {required.map((type) => {
          const stage = byType.get(type);
          const status: StageStatus = stage?.status ?? "NOT_STARTED";
          return (
            <CardElev key={type}>
              <CardElevHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardElevTitle>{stageLabels[type]}</CardElevTitle>
                    <CardElevDescription>
                      <StageStatusBadge status={status} />
                    </CardElevDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/me/stage/${type.toLowerCase()}`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                </div>
              </CardElevHeader>
              <CardElevBody>
                <StageSummary type={type} cand={cand} kase={kase} stage={stage} />
              </CardElevBody>
            </CardElev>
          );
        })}
      </div>

      <CardElev>
        <CardElevBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  allDone ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {allDone ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
              </div>
              <div className="text-sm">
                <div className="font-semibold">
                  {alreadySubmitted
                    ? "Profile submitted — the BGV team is reviewing it"
                    : "Submit your profile for background verification"}
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  {alreadySubmitted
                    ? "If a stage needs corrections you'll be emailed; fixing and resubmitting that stage sends it back to review automatically."
                    : "This sends your completed profile to the BGV team. You'll be notified by email as it's reviewed."}
                </p>
              </div>
            </div>
            <form action={submitProfileForBgv}>
              <Button type="submit" disabled={!allDone || alreadySubmitted}>
                <Send className="h-4 w-4" /> {alreadySubmitted ? "Submitted" : "Submit profile for BGV"}
              </Button>
            </form>
          </div>
        </CardElevBody>
      </CardElev>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-stage read-only summary. Relational stages read their dedicated tables;
// payload-only stages (criminal/photo/video) show the primitive payload values.
// ---------------------------------------------------------------------------

type CaseData = NonNullable<Awaited<ReturnType<typeof getCaseForCandidate>>>;
type CaseFull = NonNullable<CaseData["case"]>;
type StageRow = CaseFull["stages"][number];

function StageSummary({
  type,
  cand,
  kase,
  stage,
}: {
  type: StageType;
  cand: CaseData;
  kase: CaseFull;
  stage: StageRow | undefined;
}) {
  switch (type) {
    case "IDENTITY": {
      const name = [cand.legalFirstName, cand.legalMiddleName, cand.legalLastName].filter(Boolean).join(" ");
      return (
        <Rows>
          <Row k="Legal name" v={name || "—"} />
          <Row k="Nationality" v={cand.nationality ?? "—"} />
          <Row k="Phone" v={cand.phone ?? "—"} />
        </Rows>
      );
    }
    case "ADDRESS": {
      if (kase.addresses.length === 0) return <Empty />;
      return (
        <Rows>
          {kase.addresses.map((a) => (
            <Row
              key={a.id}
              k={a.type === "CURRENT" ? "Current" : "Permanent"}
              v={[a.line1, a.city, a.state, a.country].filter(Boolean).join(", ")}
            />
          ))}
        </Rows>
      );
    }
    case "EDUCATION": {
      if (kase.educations.length === 0) return <Empty />;
      return (
        <Rows>
          {kase.educations.map((e) => (
            <Row
              key={e.id}
              k={e.level}
              v={
                <>
                  {[e.degree, e.institution].filter(Boolean).join(", ")}
                  {e.gpa ? ` · ${e.gpa}` : ""}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {e.transcriptDocId ? "· marksheet ✓" : ""}{e.degreeDocId ? " · certificate ✓" : ""}
                  </span>
                </>
              }
            />
          ))}
        </Rows>
      );
    }
    case "EMPLOYMENT": {
      if (kase.employments.length === 0) return <Empty />;
      return (
        <Rows>
          {kase.employments.map((emp) => (
            <Row
              key={emp.id}
              k={`${emp.title} @ ${emp.employer}`}
              v={`${formatDate(emp.startDate)} – ${emp.isCurrent ? "Present" : formatDate(emp.endDate)}`}
            />
          ))}
        </Rows>
      );
    }
    case "VETERAN": {
      const v = kase.veteranRecord;
      if (!v) return <Empty label="Not applicable" />;
      return (
        <Rows>
          <Row k="Branch" v={v.branch} />
          <Row k="Service" v={`${formatDate(v.serviceStart)} – ${v.serviceEnd ? formatDate(v.serviceEnd) : "Present"}`} />
        </Rows>
      );
    }
    default: {
      // CRIMINAL / PHOTO / VIDEO — render primitive payload values, else status.
      const payload = (stage?.payload ?? {}) as unknown as Record<string, unknown>;
      const entries = Object.entries(payload).filter(
        ([k, val]) =>
          k !== "__draft" &&
          (typeof val === "string" || typeof val === "number" || typeof val === "boolean") &&
          String(val).length > 0,
      );
      if (entries.length === 0) {
        return <Empty label={stage && DONE.includes(stage.status) ? "Provided" : "Not started"} />;
      }
      return (
        <Rows>
          {entries.map(([k, val]) => (
            <Row key={k} k={prettyKey(k)} v={typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)} />
          ))}
        </Rows>
      );
    }
  }
}

function Rows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border/60">{children}</div>;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v || "—"}</span>
    </div>
  );
}

function Empty({ label = "Not started" }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

function prettyKey(k: string): string {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

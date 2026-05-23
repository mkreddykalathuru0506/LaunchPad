import Link from "next/link";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { SectionHeading } from "@/components/v2/section-heading";
import { StatCard } from "@/components/v2/stat-card";
import { EmptyState } from "@/components/v2/empty-state";
import { Avatar } from "@/components/v2/avatar";
import { CardElev, CardElevBody } from "@/components/v2/card-elev";
import { CaseStatusBadge, StageStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Inbox, Clock, ShieldAlert, Briefcase, ChevronRight } from "lucide-react";
import { formatDateTime, stageLabels } from "@/lib/utils";

export default async function VerifierQueue() {
  const session = await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  const myFilter =
    session.user.role === "VERIFIER" ? { assignedVerifierId: session.user.id } : {};

  const [awaitingReview, inProgress, needsCorrection, cleared] = await Promise.all([
    db.case.count({ where: { ...myFilter, status: "AWAITING_REVIEW" } }),
    db.case.count({ where: { ...myFilter, status: "IN_PROGRESS" } }),
    db.case.count({ where: { ...myFilter, status: "NEEDS_CORRECTION" } }),
    db.case.count({
      where: {
        ...myFilter,
        status: "CLEARED",
        clearedAt: { gte: new Date(Date.now() - 30 * 86400_000) },
      },
    }),
  ]);

  const cases = await db.case.findMany({
    where: { ...myFilter, status: { in: ["AWAITING_REVIEW", "IN_PROGRESS", "NEEDS_CORRECTION"] } },
    include: {
      candidate: { include: { user: true } },
      stages: true,
      assignedVerifier: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="Review queue"
        title={session.user.role === "VERIFIER" ? "Your cases" : "Active cases"}
        description="Cases waiting on verifier action. Newest stage submissions float to the top."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting review" value={awaitingReview} accent="info" icon={<Clock />} hint="Submitted, ready for you" />
        <StatCard label="In progress" value={inProgress} accent="primary" icon={<Briefcase />} hint="Candidate is still filling stages" />
        <StatCard label="Needs correction" value={needsCorrection} accent="warning" icon={<ShieldAlert />} hint="Waiting on candidate response" />
        <StatCard label="Cleared (30d)" value={cleared} accent="success" hint="Cases you've moved to cleared" />
      </div>

      {cases.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="Queue is clear"
          description="No cases are waiting on you right now. New stage submissions will appear here."
        />
      ) : (
        <CardElev>
          <CardElevBody className="p-0">
            <div className="border-b px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {cases.length} case{cases.length === 1 ? "" : "s"} to review
            </div>
            <ul className="divide-y">
              {cases.map((c) => {
                const pending = c.stages.find(
                  (s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW" || s.status === "NEEDS_CORRECTION"
                );
                const candName = c.candidate.user.name ?? c.candidate.user.email;
                return (
                  <li key={c.id} className="group">
                    <Link
                      href={`/work/case/${c.id}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                    >
                      <Avatar name={candName} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-semibold">{candName}</span>
                          <span className="tabnum font-mono text-xs text-primary">{c.reference}</span>
                          <CaseStatusBadge status={c.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{c.candidate.positionTitle ?? c.candidate.candidateType}</span>
                          <span aria-hidden>·</span>
                          {pending ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="font-medium text-foreground">{stageLabels[pending.type]}</span>
                              <StageStatusBadge status={pending.status} />
                            </span>
                          ) : (
                            <span>All stages reviewed</span>
                          )}
                          <span aria-hidden>·</span>
                          <span>Updated {formatDateTime(c.updatedAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardElevBody>
        </CardElev>
      )}
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { SectionHeading } from "@/components/v2/section-heading";
import { StatCard } from "@/components/v2/stat-card";
import { ActivityFeed } from "@/components/v2/activity-feed";
import { Avatar } from "@/components/v2/avatar";
import { CardElev, CardElevBody, CardElevHeader, CardElevTitle, CardElevDescription } from "@/components/v2/card-elev";
import { CaseStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/v2/progress-ring";
import { ArrowRight, UserPlus, Users, CheckCircle2, Inbox, AlertTriangle } from "lucide-react";
import { getRecentActivity } from "@/server/queries/activity";

export default async function TeamOverview() {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const [counts, verifiers, recent, activity, totals] = await Promise.all([
    db.case.groupBy({ by: ["status"], _count: { _all: true } }),
    db.user.findMany({
      where: { role: "VERIFIER", active: true },
      include: { assignedCases: { select: { id: true, status: true } } },
      orderBy: { name: "asc" },
    }),
    db.case.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { candidate: { include: { user: true } } },
    }),
    getRecentActivity({ limit: 10 }),
    db.case.count(),
  ]);

  const get = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = totals;
  const cleared = get("CLEARED");
  const awaiting = get("AWAITING_REVIEW");
  const correction = get("NEEDS_CORRECTION");
  const clearRate = total > 0 ? Math.round((cleared / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="BG Operations"
        title="Team overview"
        description="Throughput, queue health, and verifier load at a glance."
        actions={
          <Button asChild>
            <Link href="/team/new"><UserPlus className="h-4 w-4" /> New case</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cases" value={total} accent="primary" hint="All time" />
        <StatCard label="Awaiting review" value={awaiting} accent="info" icon={<Inbox />} hint="Submitted and queued" />
        <StatCard label="Needs correction" value={correction} accent="warning" icon={<AlertTriangle />} hint="Pending candidate action" />
        <StatCard label="Cleared" value={cleared} accent="success" icon={<CheckCircle2 />} hint={`${clearRate}% clearance rate`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <CardElev className="lg:col-span-2">
          <CardElevHeader>
            <CardElevTitle>Verifier load</CardElevTitle>
            <CardElevDescription>Open vs. total cases per verifier — rebalance when anyone exceeds 8 open.</CardElevDescription>
          </CardElevHeader>
          <CardElevBody>
            <ul className="space-y-3">
              {verifiers.map((v) => {
                const open = v.assignedCases.filter((c) => c.status !== "CLEARED" && c.status !== "REJECTED").length;
                const total = v.assignedCases.length;
                const pct = total > 0 ? Math.round((open / total) * 100) : 0;
                const isOver = open >= 8;
                return (
                  <li key={v.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <Avatar name={v.name ?? v.email} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-sm font-semibold">{v.name ?? v.email}</div>
                        <div className="tabnum shrink-0 text-xs text-muted-foreground">
                          <span className={isOver ? "text-warning-foreground" : "text-foreground"}>{open}</span> open · {total} total
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${isOver ? "bg-warning" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                    {isOver && (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning-foreground">
                        Over capacity
                      </span>
                    )}
                  </li>
                );
              })}
              {verifiers.length === 0 && (
                <li className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No active verifiers. Add one in Admin → Users.
                </li>
              )}
            </ul>
          </CardElevBody>
        </CardElev>

        <CardElev>
          <CardElevHeader>
            <CardElevTitle>Clearance rate</CardElevTitle>
            <CardElevDescription>All-time cleared / total</CardElevDescription>
          </CardElevHeader>
          <CardElevBody className="flex flex-col items-center gap-4">
            <ProgressRing value={clearRate} size={140} stroke={10} label={`${clearRate}%`} />
            <div className="text-center text-xs text-muted-foreground">
              <span className="tabnum font-semibold text-foreground">{cleared}</span> of{" "}
              <span className="tabnum font-semibold text-foreground">{total}</span> cases cleared
            </div>
          </CardElevBody>
        </CardElev>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CardElev>
          <CardElevHeader>
            <CardElevTitle>Recently updated</CardElevTitle>
            <CardElevDescription>Last 6 cases touched in any way</CardElevDescription>
          </CardElevHeader>
          <CardElevBody>
            <ul className="space-y-1">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/work/case/${c.id}`}
                    className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/40"
                  >
                    <Avatar name={c.candidate.user.name ?? c.candidate.user.email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{c.candidate.user.name ?? c.candidate.user.email}</span>
                        <span className="tabnum font-mono text-[10px] text-primary">{c.reference}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <CaseStatusBadge status={c.status} />
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardElevBody>
        </CardElev>

        <CardElev>
          <CardElevHeader>
            <CardElevTitle>Activity</CardElevTitle>
            <CardElevDescription>Decisions, submissions, and admin events</CardElevDescription>
          </CardElevHeader>
          <CardElevBody>
            <ActivityFeed
              events={activity.map((a) => ({
                id: a.id,
                actor: a.actorName ?? "System",
                action: a.action.replace(/^[^.]+\./, "").replace(/_/g, " "),
                target: a.target ?? undefined,
                caseRef: a.caseRef ?? undefined,
                at: a.createdAt,
              }))}
            />
          </CardElevBody>
        </CardElev>
      </div>
    </div>
  );
}

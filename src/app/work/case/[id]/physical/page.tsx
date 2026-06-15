import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPinned, AlertCircle, Camera, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { getPhysicalVerificationForCase } from "@/server/queries/physical";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { StartPhysicalPanel } from "./start-panel";
import { AddVisitForm } from "./add-visit-form";
import { VisitCard } from "./visit-card";
import { ServiceActions } from "./service-actions";
import {
  physicalVerificationStatusLabels,
  physicalStatusTone,
  formatDateTime,
} from "@/lib/utils";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const kase = await db.case.findUnique({ where: { id: params.id }, select: { reference: true } });
  return { title: kase ? `Field verification · ${kase.reference}` : "Field verification" };
}

export default async function PhysicalWorkspace({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { err?: string };
}) {
  const session = await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  const kase = await db.case.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      reference: true,
      candidate: { select: { user: { select: { name: true, email: true } } } },
    },
  });
  if (!kase) notFound();

  const pv = await getPhysicalVerificationForCase(kase.id);
  const canManage = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const candidateName = kase.candidate.user.name ?? kase.candidate.user.email;

  const backLink = (
    <Link
      href={`/work/case/${kase.id}`}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="h-4 w-4" /> Back to case {kase.reference}
    </Link>
  );

  // Service not started yet — offer to start it right here.
  if (!pv) {
    return (
      <>
        {backLink}
        <PageHeader
          title="Field verification"
          description={`${kase.reference} · ${candidateName}`}
        />
        <StartPhysicalPanel caseId={kase.id} />
      </>
    );
  }

  const agents = canManage
    ? await db.user.findMany({
        where: { role: { in: ["VERIFIER", "MANAGER"] }, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      })
    : [];

  const isOpen = pv.status === "REQUESTED" || pv.status === "IN_PROGRESS";
  const readOnly = !isOpen;
  const pending = pv.visits.filter((v) => v.status === "PENDING").length;
  const verified = pv.visits.filter((v) => v.status === "VERIFIED").length;
  const photoCount = pv.visits.reduce((n, v) => n + v.photos.length, 0);

  return (
    <>
      {backLink}
      <PageHeader
        title="Field verification"
        description={`${kase.reference} · ${candidateName}`}
        actions={
          <>
            <Badge tone="neutral" className="font-mono text-[10px] uppercase tracking-widest">
              {pv.origin === "PORTAL" ? "Portal-triggered" : "Manual"}
            </Badge>
            <Badge tone={physicalStatusTone(pv.status)}>{physicalVerificationStatusLabels[pv.status]}</Badge>
          </>
        }
      />

      {searchParams.err && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{searchParams.err}</span>
        </div>
      )}

      {/* Tally strip */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat icon={<MapPinned className="h-4 w-4" />} label="Sites" value={pv.visits.length} />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Verified" value={verified} tone="success" />
        <Stat icon={<Camera className="h-4 w-4" />} label="Photos" value={photoCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {pv.visits.length === 0 ? (
            <Empty
              title="No sites on the checklist yet"
              description="Add the addresses, colleges, or employers the field agent should visit."
            />
          ) : (
            pv.visits.map((v) => <VisitCard key={v.id} visit={v} readOnly={readOnly} />)
          )}

          {pv.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {pv.status === "CANCELLED" ? "Cancellation note" : "Field conclusion"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{pv.summary}</CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row k="Status" v={physicalVerificationStatusLabels[pv.status]} />
              <Row k="Trigger" v={pv.origin === "PORTAL" ? "Hiring portal" : "Manual (staff)"} />
              <Row k="Started by" v={pv.startedBy?.name ?? pv.startedBy?.email ?? "—"} />
              <Row k="Field agent" v={pv.assignedAgent?.name ?? pv.assignedAgent?.email ?? "Unassigned"} />
              <Row k="Started" v={formatDateTime(pv.createdAt)} />
              {pv.completedAt && <Row k="Closed" v={formatDateTime(pv.completedAt)} />}
              {pv.reason && (
                <div className="border-t border-dashed pt-2 text-xs text-muted-foreground">{pv.reason}</div>
              )}
            </CardContent>
          </Card>

          {!readOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manage</CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceActions
                  verificationId={pv.id}
                  agents={agents.map((a) => ({ id: a.id, name: a.name ?? a.email }))}
                  assignedAgentId={pv.assignedAgentId}
                  canManage={canManage}
                  pendingVisits={pending}
                  isOpen={isOpen}
                />
              </CardContent>
            </Card>
          )}

          {!readOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add a visit</CardTitle>
              </CardHeader>
              <CardContent>
                <AddVisitForm verificationId={pv.id} />
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "neutral" | "success";
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={tone === "success" ? "text-success" : "text-brand"}>{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-right">{v}</div>
    </div>
  );
}

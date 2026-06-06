import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export default async function Reports() {
  await requireRole(["MANAGER", "ADMIN"]);
  const [stageStats, recentDecisions] = await Promise.all([
    db.stage.groupBy({ by: ["type", "status"], _count: { _all: true } }),
    db.stageReview.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { reviewer: true, stage: { include: { case: true } } },
    }),
  ]);

  const byType = new Map<string, Record<string, number>>();
  for (const row of stageStats) {
    const t = byType.get(row.type) ?? {};
    t[row.status] = row._count._all;
    byType.set(row.type, t);
  }

  return (
    <>
      <PageHeader title="Reports" description="Stage throughput and recent decisions." />
      <Card>
        <CardHeader><CardTitle className="text-base">Stage status distribution</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>Stage</TH><TH>Approved</TH><TH>Submitted</TH><TH>Needs correction</TH><TH>Rejected</TH><TH>Not started</TH></TR></THead>
            <TBody>
              {[...byType.entries()].map(([t, row]) => (
                <TR key={t}>
                  <TD className="font-medium">{t}</TD>
                  <TD>{row.APPROVED ?? 0}</TD>
                  <TD>{(row.SUBMITTED ?? 0) + (row.UNDER_REVIEW ?? 0)}</TD>
                  <TD>{row.NEEDS_CORRECTION ?? 0}</TD>
                  <TD>{row.REJECTED ?? 0}</TD>
                  <TD>{(row.NOT_STARTED ?? 0) + (row.IN_PROGRESS ?? 0)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Recent decisions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>When</TH><TH>Case</TH><TH>Stage</TH><TH>Decision</TH><TH>Reviewer</TH></TR></THead>
            <TBody>
              {recentDecisions.map((r) => (
                <TR key={r.id}>
                  <TD className="text-muted-foreground">{formatDateTime(r.createdAt)}</TD>
                  <TD className="tabnum font-mono text-xs text-brand">{r.stage.case.reference}</TD>
                  <TD>{r.stage.type}</TD>
                  <TD>{r.decision}</TD>
                  <TD>{r.reviewer.name ?? r.reviewer.email}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

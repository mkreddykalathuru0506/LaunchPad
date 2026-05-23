import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export default async function AuditLog() {
  const events = await db.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: true },
  });
  return (
    <>
      <PageHeader title="Audit log" description="Append-only record of every action." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>When</TH><TH>Actor</TH><TH>Action</TH><TH>Target</TH><TH>Case</TH><TH>IP</TH></TR></THead>
            <TBody>
              {events.map((e) => (
                <TR key={e.id}>
                  <TD className="text-muted-foreground">{formatDateTime(e.createdAt)}</TD>
                  <TD>{e.actor?.name ?? e.actor?.email ?? "system"}</TD>
                  <TD className="font-mono text-xs">{e.action}</TD>
                  <TD>{e.target ?? "—"}</TD>
                  <TD>{e.caseId ?? "—"}</TD>
                  <TD className="text-muted-foreground">{e.ip ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

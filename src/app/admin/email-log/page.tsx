import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export default async function EmailLog() {
  const items = await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Email log" description="Every transactional email Launch Pad has sent." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>When</TH><TH>To</TH><TH>Subject</TH><TH>Template</TH><TH>Status</TH></TR></THead>
            <TBody>
              {items.map((e) => (
                <TR key={e.id}>
                  <TD className="text-muted-foreground">{formatDateTime(e.createdAt)}</TD>
                  <TD>{e.toEmail}</TD>
                  <TD>{e.subject}</TD>
                  <TD className="text-muted-foreground">{e.templateId ?? "—"}</TD>
                  <TD><Badge tone={e.status === "sent" ? "success" : e.status === "failed" ? "danger" : "info"}>{e.status}</Badge></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

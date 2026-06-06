import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { Empty } from "@/components/ui/empty";
import { FileText } from "lucide-react";

export default async function DocumentsPage() {
  const session = await requireRole("CANDIDATE");
  const cand = await db.candidate.findUnique({ where: { userId: session.user.id }, include: { case: { include: { documents: { orderBy: { createdAt: "desc" } } } } } });
  const docs = cand?.case?.documents ?? [];
  return (
    <>
      <PageHeader title="My documents" description="All files you've submitted, with their integrity hashes." />
      {docs.length === 0 ? (
        <Empty title="No documents yet" description="Documents you upload through any stage will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Filename</TH>
                  <TH>Kind</TH>
                  <TH>Size</TH>
                  <TH>SHA-256</TH>
                  <TH>Uploaded</TH>
                </TR>
              </THead>
              <TBody>
                {docs.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium"><div className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{d.filename}</div></TD>
                    <TD>{d.kind}</TD>
                    <TD>{(d.sizeBytes / 1024).toFixed(1)} KB</TD>
                    <TD className="font-mono text-xs">{d.sha256.slice(0, 12)}…</TD>
                    <TD>{formatDateTime(d.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

import Link from "next/link";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CaseStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export default async function AllCases() {
  await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  const cases = await db.case.findMany({
    include: { candidate: { include: { user: true } }, assignedVerifier: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="All cases" description="Every case in the system, regardless of state." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Case</TH><TH>Candidate</TH><TH>Type</TH><TH>Status</TH><TH>Verifier</TH><TH>Updated</TH><TH />
              </TR>
            </THead>
            <TBody>
              {cases.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.reference}</TD>
                  <TD>{c.candidate.user.name ?? c.candidate.user.email}</TD>
                  <TD>{c.candidate.candidateType}</TD>
                  <TD><CaseStatusBadge status={c.status} /></TD>
                  <TD>{c.assignedVerifier?.name ?? "—"}</TD>
                  <TD className="text-muted-foreground">{formatDateTime(c.updatedAt)}</TD>
                  <TD><Button asChild size="sm" variant="outline"><Link href={`/work/case/${c.id}`}>Open</Link></Button></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getPhysicalQueue } from "@/server/queries/physical";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { physicalVerificationStatusLabels, physicalStatusTone, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Field verification queue" };

export default async function PhysicalQueue() {
  await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  const rows = await getPhysicalQueue();

  return (
    <>
      <PageHeader
        title="Field verification"
        description="On-ground visits to candidate addresses, colleges, and employers. Optional, background service."
        actions={
          <Badge tone="warn" className="font-mono text-[10px] uppercase tracking-widest">
            {rows.length} open
          </Badge>
        }
      />

      {rows.length === 0 ? (
        <Empty
          title="No open field verifications"
          description="Start one from any case's Field Verification tab, or it can be triggered from the hiring portal."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Case</th>
                  <th className="p-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Candidate</th>
                  <th className="p-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                  <th className="p-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Agent</th>
                  <th className="hidden p-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:table-cell">Progress</th>
                  <th className="hidden p-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground md:table-cell">Started</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t transition-colors hover:bg-accent/50">
                    <td className="p-3">
                      <Link
                        href={`/work/case/${r.caseId}/physical`}
                        className="focus-ring inline-flex items-center gap-2 rounded-md font-medium text-brand hover:underline"
                      >
                        <MapPinned className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {r.reference}
                      </Link>
                    </td>
                    <td className="p-3">{r.candidateName}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={physicalStatusTone(r.status)}>{physicalVerificationStatusLabels[r.status]}</Badge>
                        {r.origin === "PORTAL" && (
                          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">portal</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.agentName ?? "Unassigned"}</td>
                    <td className="hidden p-3 text-right font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">
                      {r.verified}/{r.total} verified
                    </td>
                    <td className="hidden p-3 font-mono text-xs tracking-wide text-muted-foreground md:table-cell">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/work/case/${r.caseId}/physical`}
                        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={`Open ${r.reference}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

import Link from "next/link";
import { Stage, StageType, StageStatus, StageReview, User } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StageStatusBadge } from "@/components/ui/status-badge";
import { stageLabels, stageBlurbs, formatDateTime } from "@/lib/utils";
import { ArrowLeft, MessageSquareWarning } from "lucide-react";

export function StageShell({
  type, stage, lastCorrection, children,
}: {
  type: StageType;
  stage?: Pick<Stage, "status" | "submittedAt" | "decidedAt"> | null;
  lastCorrection?: (StageReview & { reviewer: User | null }) | null;
  children: React.ReactNode;
}) {
  const status: StageStatus = stage?.status ?? "NOT_STARTED";
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/me" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{stageLabels[type]}</CardTitle>
              <CardDescription>{stageBlurbs[type]}</CardDescription>
            </div>
            <StageStatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent>
          {status === "NEEDS_CORRECTION" && lastCorrection && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <MessageSquareWarning className="mt-0.5 h-4 w-4 text-warning-foreground" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Correction requested {formatDateTime(lastCorrection.createdAt)}</div>
                <p className="mt-0.5 text-muted-foreground">{lastCorrection.comment ?? "Please review and resubmit."}</p>
              </div>
            </div>
          )}
          {status === "APPROVED" && (
            <div className="mb-6 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
              Approved on {formatDateTime(stage?.decidedAt)}. No further action needed.
            </div>
          )}
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

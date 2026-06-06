import Link from "next/link";
import { Stage, StageType, StageStatus, StageReview, User } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StageStatusBadge } from "@/components/ui/status-badge";
import { stageLabels, stageBlurbs, formatDateTime } from "@/lib/utils";
import { ArrowLeft, MessageSquareWarning, AlertCircle, Save } from "lucide-react";
import { FlowFeedback } from "@/components/stage/flow-feedback";

export function StageShell({
  type, stage, lastCorrection, error, saved, children,
}: {
  type: StageType;
  stage?: Pick<Stage, "status" | "submittedAt" | "decidedAt"> | null;
  lastCorrection?: (StageReview & { reviewer: User | null }) | null;
  /** Inline validation message from a failed submit (?err=) — see withStageErrors. */
  error?: string;
  /** True when the candidate just saved a draft (?saved=1). */
  saved?: boolean;
  children: React.ReactNode;
}) {
  const status: StageStatus = stage?.status ?? "NOT_STARTED";
  return (
    <div className="mx-auto max-w-3xl">
      {/* Dismissible popup mirror of the inline error banner — closable so the
          candidate can keep editing without losing their (draft-preserved) input. */}
      <FlowFeedback error={error} />
      <Link href="/me" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
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
          {saved && !error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-3">
              <Save className="mt-0.5 h-4 w-4 text-success" aria-hidden="true" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Draft saved</div>
                <p className="mt-0.5 text-muted-foreground">Your progress is saved. You can finish and submit anytime.</p>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Couldn&apos;t save this stage</div>
                <p className="mt-0.5 text-muted-foreground">{error}</p>
              </div>
            </div>
          )}
          {status === "NEEDS_CORRECTION" && lastCorrection && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <MessageSquareWarning className="mt-0.5 h-4 w-4 text-warning-foreground dark:text-warning" aria-hidden="true" />
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

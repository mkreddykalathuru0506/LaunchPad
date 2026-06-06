"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decideStage } from "@/server/actions/review";
import { CheckCircle2, XCircle, MessageSquareWarning } from "lucide-react";

export function StageReviewForm({ stageId }: { stageId: string; stageType: string }) {
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "NEEDS_CORRECTION" | null>(null);
  const [comment, setComment] = useState("");

  if (decision === null) {
    return (
      <div className="space-y-2 rounded-2xl border border-dashed bg-muted/30 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Review · Decision
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="success" size="sm" onClick={() => setDecision("APPROVED")}>
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-warning/60 text-warning-foreground hover:bg-warning/10 dark:text-warning"
            onClick={() => setDecision("NEEDS_CORRECTION")}
          >
            <MessageSquareWarning aria-hidden="true" className="h-4 w-4" /> Request correction
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/60 text-destructive hover:bg-destructive/10"
            onClick={() => setDecision("REJECTED")}
          >
            <XCircle aria-hidden="true" className="h-4 w-4" /> Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={decideStage} className="space-y-3 rounded-2xl border border-dashed bg-muted/30 p-3">
      <input type="hidden" name="stageId" value={stageId} />
      <input type="hidden" name="decision" value={decision} />
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Review · {decision.replace("_", " ")}
      </p>
      <div className="text-[13px] font-medium">
        {decision === "APPROVED" && "Approving stage — optional note to candidate:"}
        {decision === "REJECTED" && "Rejecting stage — reason (sent to candidate):"}
        {decision === "NEEDS_CORRECTION" && "Requesting correction — what does the candidate need to fix?"}
      </div>
      <Textarea
        name="comment"
        rows={3}
        required={decision !== "APPROVED"}
        placeholder={decision === "APPROVED" ? "Optional comment" : "Be specific. The candidate sees this."}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {comment.length} chars
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setDecision(null)}>Cancel</Button>
          <Button type="submit" size="sm" variant={decision === "APPROVED" ? "success" : decision === "REJECTED" ? "destructive" : "warning"}>
            Confirm {decision.toLowerCase().replace("_", " ")}
          </Button>
        </div>
      </div>
    </form>
  );
}

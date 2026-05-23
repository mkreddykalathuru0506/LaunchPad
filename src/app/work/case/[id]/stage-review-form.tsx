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
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
        <Button variant="success" size="sm" onClick={() => setDecision("APPROVED")}>
          <CheckCircle2 className="h-4 w-4" /> Approve
        </Button>
        <Button variant="warning" size="sm" onClick={() => setDecision("NEEDS_CORRECTION")}>
          <MessageSquareWarning className="h-4 w-4" /> Request correction
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDecision("REJECTED")}>
          <XCircle className="h-4 w-4" /> Reject
        </Button>
      </div>
    );
  }

  return (
    <form action={decideStage} className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <input type="hidden" name="stageId" value={stageId} />
      <input type="hidden" name="decision" value={decision} />
      <div className="text-sm font-medium">
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setDecision(null)}>Cancel</Button>
        <Button type="submit" size="sm" variant={decision === "APPROVED" ? "success" : decision === "REJECTED" ? "destructive" : "warning"}>
          Confirm {decision.toLowerCase().replace("_", " ")}
        </Button>
      </div>
    </form>
  );
}

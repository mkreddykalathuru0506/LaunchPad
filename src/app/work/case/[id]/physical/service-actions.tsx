"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/stage/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  assignFieldAgent,
  completePhysicalVerification,
  cancelPhysicalVerification,
} from "@/server/actions/physical";

const selectCls =
  "flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring";

export function ServiceActions({
  verificationId,
  agents,
  assignedAgentId,
  canManage,
  pendingVisits,
  isOpen,
}: {
  verificationId: string;
  agents: { id: string; name: string }[];
  assignedAgentId: string | null;
  canManage: boolean;
  pendingVisits: number;
  isOpen: boolean;
}) {
  const [mode, setMode] = useState<"none" | "complete" | "cancel">("none");

  return (
    <div className="space-y-4">
      {canManage && (
        <form action={assignFieldAgent} className="space-y-2">
          <input type="hidden" name="verificationId" value={verificationId} />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Field agent</p>
          <Field label="Assigned agent" htmlFor="agentId">
            <select id="agentId" name="agentId" defaultValue={assignedAgentId ?? ""} className={selectCls}>
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" variant="outline" size="sm">
            <UserCog className="h-4 w-4" /> Update agent
          </Button>
        </form>
      )}

      {isOpen && (
        <div className="space-y-3 border-t border-dashed pt-4">
          {mode === "none" && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => setMode("complete")}
                disabled={pendingVisits > 0}
                title={pendingVisits > 0 ? "Record an outcome on every visit first" : undefined}
              >
                <CheckCircle2 className="h-4 w-4" /> Complete service
              </Button>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/60 text-destructive hover:bg-destructive/10"
                  onClick={() => setMode("cancel")}
                >
                  <XCircle className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          )}

          {pendingVisits > 0 && mode === "none" && (
            <p className="text-[11px] text-muted-foreground">
              {pendingVisits} visit{pendingVisits > 1 ? "s" : ""} still pending an outcome.
            </p>
          )}

          {mode === "complete" && (
            <form action={completePhysicalVerification} className="space-y-2">
              <input type="hidden" name="verificationId" value={verificationId} />
              <Field label="Field conclusion" htmlFor="summary">
                <Textarea name="summary" id="summary" rows={3} placeholder="Overall on-ground conclusion (optional)" />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode("none")}>
                  Cancel
                </Button>
                <SubmitButton variant="success" size="sm">
                  Confirm complete
                </SubmitButton>
              </div>
            </form>
          )}

          {mode === "cancel" && (
            <form action={cancelPhysicalVerification} className="space-y-2">
              <input type="hidden" name="verificationId" value={verificationId} />
              <Field label="Reason for cancelling" htmlFor="reason">
                <Textarea name="reason" id="reason" rows={2} placeholder="Why is the field service being stopped?" />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode("none")}>
                  Back
                </Button>
                <SubmitButton variant="destructive" size="sm">
                  Confirm cancel
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

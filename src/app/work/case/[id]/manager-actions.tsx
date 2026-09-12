import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/stage/fields";
import { reassignCase, manuallyClearCase } from "@/server/actions/review";

export function ManagerActions({
  caseId, verifiers, currentVerifierId, canClear, alreadyCleared, clearanceIncomplete,
}: {
  caseId: string;
  verifiers: { id: string; name: string }[];
  currentVerifierId: string | null;
  canClear: boolean;
  alreadyCleared: boolean;
  /**
   * The case reads CLEARED but its clearance never actually completed — no
   * report was generated, so the emails and the portal callback did not happen
   * either. Lets the desk finish the handoff; see the gate below.
   */
  clearanceIncomplete: boolean;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="text-base font-display">Manager actions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form action={reassignCase} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Case · Reassignment
          </p>
          <Field label="Reassign to verifier" htmlFor="verifierId">
            <select id="verifierId" name="verifierId" defaultValue={currentVerifierId ?? ""}
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring">
              {verifiers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Button type="submit" variant="outline" size="sm">Reassign</Button>
        </form>

        {/*
          Gated on the clearance ARTEFACT, not on the status. A case can read
          CLEARED while its report, its clearance emails and its portal callback
          never happened — issueClearance used to bail out on the status alone,
          and a candidate-side VIDEO skip could clear a case outright. The old
          `!alreadyCleared` gate hid the one control that finishes those cases,
          exactly when it was needed. issueClearance is idempotent on
          clearedReportPath, so this disappears once the clearance is real.
        */}
        {canClear && (!alreadyCleared || clearanceIncomplete) && (
          <form action={manuallyClearCase} className="space-y-2 border-t border-dashed pt-4">
            <input type="hidden" name="caseId" value={caseId} />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Case · Clearance
            </p>
            <div className="text-sm text-muted-foreground">
              {alreadyCleared
                ? "This case reads cleared, but its clearance report was never generated and the result was never sent out. Issue it to complete the handoff."
                : "All stages are approved. Issue final clearance and generate the report."}
            </div>
            <Button type="submit" variant="success" size="sm">
              {alreadyCleared ? "Complete clearance" : "Issue clearance"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

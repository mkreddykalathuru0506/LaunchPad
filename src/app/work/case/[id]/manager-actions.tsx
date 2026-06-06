import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/stage/fields";
import { reassignCase, manuallyClearCase } from "@/server/actions/review";

export function ManagerActions({
  caseId, verifiers, currentVerifierId, canClear, alreadyCleared,
}: {
  caseId: string;
  verifiers: { id: string; name: string }[];
  currentVerifierId: string | null;
  canClear: boolean;
  alreadyCleared: boolean;
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

        {!alreadyCleared && canClear && (
          <form action={manuallyClearCase} className="space-y-2 border-t border-dashed pt-4">
            <input type="hidden" name="caseId" value={caseId} />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Case · Clearance
            </p>
            <div className="text-sm text-muted-foreground">
              All stages are approved. Issue final clearance and generate the report.
            </div>
            <Button type="submit" variant="success" size="sm">Issue clearance</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

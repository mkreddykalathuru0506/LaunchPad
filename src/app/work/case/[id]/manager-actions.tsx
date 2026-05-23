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
    <Card>
      <CardHeader><CardTitle className="text-base">Manager actions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form action={reassignCase} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <Field label="Reassign to verifier" htmlFor="verifierId">
            <select id="verifierId" name="verifierId" defaultValue={currentVerifierId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-ring">
              {verifiers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Button type="submit" variant="outline" size="sm">Reassign</Button>
        </form>

        {!alreadyCleared && canClear && (
          <form action={manuallyClearCase} className="space-y-2 border-t pt-4">
            <input type="hidden" name="caseId" value={caseId} />
            <div className="text-sm">
              All stages are approved. Issue final clearance and generate the report.
            </div>
            <Button type="submit" variant="success" size="sm">Issue clearance</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

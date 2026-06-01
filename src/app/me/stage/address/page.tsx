import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitAddressStage } from "@/server/actions/stage";
import { draftFields, draftFiles } from "@/lib/stage-draft";

function AddressBlock({
  kind, prefill, draft, savedProof,
}: {
  kind: "CURRENT" | "PERMANENT";
  prefill?: { line1?: string; line2?: string | null; city?: string; state?: string; postalCode?: string; country?: string } | null;
  draft: Record<string, string>;
  savedProof?: { filename: string };
}) {
  const dv = (field: string, fallback?: string | null) => draft[`${kind}_${field}`] ?? fallback ?? "";
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 text-sm font-semibold">{kind === "CURRENT" ? "Current address" : "Permanent address"}</div>
      <FieldGrid>
        <Field label="Address line 1" htmlFor={`${kind}_line1`} required className="sm:col-span-2">
          <Input id={`${kind}_line1`} name={`${kind}_line1`} defaultValue={dv("line1", prefill?.line1)} required />
        </Field>
        <Field label="Address line 2" htmlFor={`${kind}_line2`} className="sm:col-span-2">
          <Input id={`${kind}_line2`} name={`${kind}_line2`} defaultValue={dv("line2", prefill?.line2)} />
        </Field>
        <Field label="City" htmlFor={`${kind}_city`} required>
          <Input id={`${kind}_city`} name={`${kind}_city`} defaultValue={dv("city", prefill?.city)} required />
        </Field>
        <Field label="State / Province" htmlFor={`${kind}_state`} required>
          <Input id={`${kind}_state`} name={`${kind}_state`} defaultValue={dv("state", prefill?.state)} required />
        </Field>
        <Field label="Postal code" htmlFor={`${kind}_postalCode`} required>
          <Input id={`${kind}_postalCode`} name={`${kind}_postalCode`} defaultValue={dv("postalCode", prefill?.postalCode)} required />
        </Field>
        <Field label="Country" htmlFor={`${kind}_country`} required>
          <Input id={`${kind}_country`} name={`${kind}_country`} defaultValue={dv("country", prefill?.country)} required />
        </Field>
        <Field label="Residing since" htmlFor={`${kind}_fromDate`}>
          <Input id={`${kind}_fromDate`} name={`${kind}_fromDate`} type="date" defaultValue={dv("fromDate")} />
        </Field>
      </FieldGrid>
      <div className="mt-4">
        <FileField name={`${kind}_proof`} label="Address proof" accept="image/*,.pdf"
          hint="Utility bill, lease, or bank statement (less than 90 days old)." />
        {savedProof && (
          <p className="mt-2 text-sm text-muted-foreground">Saved in your draft: <span className="font-medium">{savedProof.filename}</span>.</p>
        )}
      </div>
    </div>
  );
}

export default async function AddressStagePage({ searchParams }: { searchParams?: { err?: string; saved?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "ADDRESS") ?? null;
  const current = cand?.case?.addresses.find((a) => a.type === "CURRENT");
  const permanent = cand?.case?.addresses.find((a) => a.type === "PERMANENT");
  const lastCorrection = stage
    ? await db.stageReview.findFirst({ where: { stageId: stage.id, decision: "NEEDS_CORRECTION" }, orderBy: { createdAt: "desc" }, include: { reviewer: true } })
    : null;
  const draft = draftFields(stage);
  const draftDocs = draftFiles(stage);

  return (
    <StageShell type="ADDRESS" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <form action={submitAddressStage} className="space-y-6">
        <AddressBlock kind="CURRENT" prefill={current} draft={draft} savedProof={draftDocs.CURRENT_proof} />
        <AddressBlock kind="PERMANENT" prefill={permanent} draft={draft} savedProof={draftDocs.PERMANENT_proof} />
        <StageFormFooter stageType="ADDRESS" submitLabel="Submit address stage" />
      </form>
    </StageShell>
  );
}

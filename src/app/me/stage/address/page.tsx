import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitAddressStage } from "@/server/actions/stage";

function AddressBlock({ kind, prefill }: { kind: "CURRENT" | "PERMANENT"; prefill?: any }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 text-sm font-semibold">{kind === "CURRENT" ? "Current address" : "Permanent address"}</div>
      <FieldGrid>
        <Field label="Address line 1" htmlFor={`${kind}_line1`} required className="sm:col-span-2">
          <Input id={`${kind}_line1`} name={`${kind}_line1`} defaultValue={prefill?.line1 ?? ""} required />
        </Field>
        <Field label="Address line 2" htmlFor={`${kind}_line2`} className="sm:col-span-2">
          <Input id={`${kind}_line2`} name={`${kind}_line2`} defaultValue={prefill?.line2 ?? ""} />
        </Field>
        <Field label="City" htmlFor={`${kind}_city`} required>
          <Input id={`${kind}_city`} name={`${kind}_city`} defaultValue={prefill?.city ?? ""} required />
        </Field>
        <Field label="State / Province" htmlFor={`${kind}_state`} required>
          <Input id={`${kind}_state`} name={`${kind}_state`} defaultValue={prefill?.state ?? ""} required />
        </Field>
        <Field label="Postal code" htmlFor={`${kind}_postalCode`} required>
          <Input id={`${kind}_postalCode`} name={`${kind}_postalCode`} defaultValue={prefill?.postalCode ?? ""} required />
        </Field>
        <Field label="Country" htmlFor={`${kind}_country`} required>
          <Input id={`${kind}_country`} name={`${kind}_country`} defaultValue={prefill?.country ?? ""} required />
        </Field>
        <Field label="Residing since" htmlFor={`${kind}_fromDate`}>
          <Input id={`${kind}_fromDate`} name={`${kind}_fromDate`} type="date" />
        </Field>
      </FieldGrid>
      <div className="mt-4">
        <FileField name={`${kind}_proof`} label="Address proof" accept="image/*,.pdf"
          hint="Utility bill, lease, or bank statement (less than 90 days old)." />
      </div>
    </div>
  );
}

export default async function AddressStagePage({ searchParams }: { searchParams?: { err?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "ADDRESS") ?? null;
  const current = cand?.case?.addresses.find((a) => a.type === "CURRENT");
  const permanent = cand?.case?.addresses.find((a) => a.type === "PERMANENT");
  const lastCorrection = stage
    ? await db.stageReview.findFirst({ where: { stageId: stage.id, decision: "NEEDS_CORRECTION" }, orderBy: { createdAt: "desc" }, include: { reviewer: true } })
    : null;

  return (
    <StageShell type="ADDRESS" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined}>
      <form action={submitAddressStage} className="space-y-6">
        <AddressBlock kind="CURRENT" prefill={current} />
        <AddressBlock kind="PERMANENT" prefill={permanent} />
        <div className="flex justify-end">
          <SubmitButton>Submit address stage</SubmitButton>
        </div>
      </form>
    </StageShell>
  );
}

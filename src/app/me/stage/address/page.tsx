import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitAddressStage } from "@/server/actions/stage";
import { draftFields, draftFiles, isoDateValue } from "@/lib/stage-draft";
import { MapPin } from "lucide-react";

function AddressBlock({
  kind, section, prefill, draft, savedProof,
}: {
  kind: "CURRENT" | "PERMANENT";
  section: string;
  prefill?: { line1?: string; line2?: string | null; city?: string; state?: string; postalCode?: string; country?: string; fromDate?: Date | null } | null;
  draft: Record<string, string>;
  savedProof?: { filename: string };
}) {
  const dv = (field: string, fallback?: string | null) => draft[`${kind}_${field}`] ?? fallback ?? "";
  return (
    <section className="rounded-2xl border border-dashed p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Section {section} · {kind === "CURRENT" ? "Current Address" : "Permanent Address"}
        </span>
        <span aria-hidden className="text-brand [&>svg]:h-4 [&>svg]:w-4">
          <MapPin />
        </span>
      </div>
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
          <Input id={`${kind}_fromDate`} name={`${kind}_fromDate`} type="date" defaultValue={dv("fromDate", isoDateValue(prefill?.fromDate))} />
        </Field>
      </FieldGrid>
      <div className="mt-4">
        <FileField name={`${kind}_proof`} label="Address proof" accept="image/*,.pdf"
          hint="Utility bill, lease, or bank statement (less than 90 days old)." />
        {savedProof && (
          <p className="mt-2 font-mono text-[11px] tracking-wide text-muted-foreground">Saved: <span className="font-medium text-foreground">{savedProof.filename}</span> · re-select only to replace.</p>
        )}
      </div>
    </section>
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
  // The "Saved" hint also covers a previously SUBMITTED proof (submit keeps it
  // unless replaced), not just an in-flight draft upload.
  const docName = new Map((cand?.case?.documents ?? []).map((d) => [d.id, d.filename]));
  const savedProofFor = (kind: "CURRENT" | "PERMANENT", proofDocId?: string | null) =>
    draftDocs[`${kind}_proof`] ??
    (proofDocId ? { filename: docName.get(proofDocId) ?? "uploaded document" } : undefined);

  return (
    <StageShell type="ADDRESS" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <form action={submitAddressStage} className="space-y-6">
        <AddressBlock kind="CURRENT" section="01" prefill={current} draft={draft} savedProof={savedProofFor("CURRENT", current?.proofDocId)} />
        <AddressBlock kind="PERMANENT" section="02" prefill={permanent} draft={draft} savedProof={savedProofFor("PERMANENT", permanent?.proofDocId)} />
        <StageFormFooter stageType="ADDRESS" submitLabel="Submit address stage" />
      </form>
    </StageShell>
  );
}

import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitCriminalStage } from "@/server/actions/stage";
import { draftFields } from "@/lib/stage-draft";

export default async function CriminalStagePage({ searchParams }: { searchParams?: { err?: string; saved?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "CRIMINAL") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({ where: { stageId: stage.id, decision: "NEEDS_CORRECTION" }, orderBy: { createdAt: "desc" }, include: { reviewer: true } })
    : null;
  const draft = draftFields(stage);

  return (
    <StageShell type="CRIMINAL" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <form action={submitCriminalStage} className="space-y-6">
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="font-semibold">FCRA / DPDP Disclosure & Authorization</div>
          <p className="mt-2 text-muted-foreground">
            I authorize ElivixIT and its background verification partners to obtain a consumer report on
            me for employment-related purposes. I understand the report may contain information about my
            criminal record, employment history, and education, and that I am entitled to a copy upon
            request. I confirm the information I provide is accurate.
          </p>
        </div>

        <FieldGrid>
          <Field label="Jurisdictions lived in (last 7 years)" htmlFor="jurisdictions" required hint="Comma-separated city, state, country.">
            <Textarea id="jurisdictions" name="jurisdictions" required rows={3} defaultValue={draft.jurisdictions ?? ""} />
          </Field>
          <Field label="Disclosures (anything you want us to know up front)" htmlFor="declarations">
            <Textarea id="declarations" name="declarations" rows={3} defaultValue={draft.declarations ?? ""} />
          </Field>
          <Field label="Sign with your full legal name" htmlFor="consentName" required>
            <Input id="consentName" name="consentName" required placeholder="Full legal name" defaultValue={draft.consentName ?? ""} />
          </Field>
          <Field label="I agree" htmlFor="consentAcknowledged" required className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input id="consentAcknowledged" name="consentAcknowledged" type="checkbox" required className="h-4 w-4" defaultChecked={draft.consentAcknowledged === "on"} />
              I have read and authorize the consumer report disclosure above.
            </label>
          </Field>
        </FieldGrid>

        <StageFormFooter stageType="CRIMINAL" submitLabel="Submit criminal stage" />
      </form>
    </StageShell>
  );
}

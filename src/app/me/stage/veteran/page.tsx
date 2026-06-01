import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitVeteranStage } from "@/server/actions/stage";
import { draftFields } from "@/lib/stage-draft";
import { Empty } from "@/components/ui/empty";

export default async function VeteranStagePage({ searchParams }: { searchParams?: { err?: string; saved?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "VETERAN") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({ where: { stageId: stage.id, decision: "NEEDS_CORRECTION" }, orderBy: { createdAt: "desc" }, include: { reviewer: true } })
    : null;
  if (!stage) {
    return <Empty title="Veteran stage not required" description="This stage is only required when you self-identify as a veteran." />;
  }
  const draft = draftFields(stage);

  return (
    <StageShell type="VETERAN" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <form action={submitVeteranStage} className="space-y-6">
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Reporting veteran status is voluntary and protected under USERRA. Information is used only to
          confirm eligibility for veteran-preference programs.
        </p>
        <FieldGrid>
          <Field label="Branch of service" htmlFor="branch" required>
            <Input id="branch" name="branch" required defaultValue={draft.branch ?? ""} />
          </Field>
          <Field label="Service number" htmlFor="serviceNumber" hint="Stored encrypted at rest.">
            <Input id="serviceNumber" name="serviceNumber" />
          </Field>
          <Field label="Service start" htmlFor="serviceStart" required>
            <Input id="serviceStart" name="serviceStart" type="date" required defaultValue={draft.serviceStart ?? ""} />
          </Field>
          <Field label="Service end" htmlFor="serviceEnd">
            <Input id="serviceEnd" name="serviceEnd" type="date" defaultValue={draft.serviceEnd ?? ""} />
          </Field>
          <Field label="Character of service" htmlFor="characterOfService" className="sm:col-span-2">
            <select id="characterOfService" name="characterOfService" defaultValue={draft.characterOfService ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-ring">
              <option value="">Select…</option>
              <option>Honorable</option>
              <option>General</option>
              <option>Other Than Honorable</option>
              <option>Bad Conduct</option>
              <option>Dishonorable</option>
              <option>Uncharacterized</option>
            </select>
          </Field>
        </FieldGrid>
        <FileField name="discharge" label="DD-214 or discharge document" accept="image/*,.pdf" />
        <StageFormFooter stageType="VETERAN" submitLabel="Submit veteran stage" />
      </form>
    </StageShell>
  );
}

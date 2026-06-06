import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitVeteranStage } from "@/server/actions/stage";
import { draftFields, isoDateValue } from "@/lib/stage-draft";
import { Empty } from "@/components/ui/empty";
import { Medal } from "lucide-react";

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
  // In-flight draft wins; fall back to the submitted record (a successful
  // submit clears __draft so corrections edit real data).
  const draft = draftFields(stage);
  const rec = cand?.case?.veteranRecord;
  const dv = (k: string, fallback?: string | null) => draft[k] ?? fallback ?? "";

  return (
    <StageShell type="VETERAN" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <form action={submitVeteranStage} className="space-y-6">
        {/* USERRA voluntary-disclosure notice — info dossier card. */}
        <section className="rounded-2xl border border-dashed border-brand/40 bg-accent/30 p-4">
          <div className="flex items-center gap-2">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-brand [&>svg]:h-3.5 [&>svg]:w-3.5">
              <Medal />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Voluntary Disclosure · USERRA
            </span>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            Reporting veteran status is voluntary and protected under USERRA. Information is used only to
            confirm eligibility for veteran-preference programs.
          </p>
        </section>
        <FieldGrid>
          <Field label="Branch of service" htmlFor="branch" required>
            <Input id="branch" name="branch" required defaultValue={dv("branch", rec?.branch)} />
          </Field>
          <Field label="Service number" htmlFor="serviceNumber" hint="Stored encrypted at rest.">
            <Input id="serviceNumber" name="serviceNumber" />
          </Field>
          <Field label="Service start" htmlFor="serviceStart" required>
            <Input id="serviceStart" name="serviceStart" type="date" required defaultValue={dv("serviceStart", isoDateValue(rec?.serviceStart))} />
          </Field>
          <Field label="Service end" htmlFor="serviceEnd">
            <Input id="serviceEnd" name="serviceEnd" type="date" defaultValue={dv("serviceEnd", isoDateValue(rec?.serviceEnd))} />
          </Field>
          <Field label="Character of service" htmlFor="characterOfService" className="sm:col-span-2">
            <select id="characterOfService" name="characterOfService" defaultValue={dv("characterOfService", rec?.characterOfService)}
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring">
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

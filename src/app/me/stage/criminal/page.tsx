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
import { ShieldCheck, PenLine } from "lucide-react";

export default async function CriminalStagePage({ searchParams }: { searchParams?: { err?: string; saved?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "CRIMINAL") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({ where: { stageId: stage.id, decision: "NEEDS_CORRECTION" }, orderBy: { createdAt: "desc" }, include: { reviewer: true } })
    : null;
  // In-flight draft wins; fall back to the submitted payload (a successful
  // submit replaces the payload — and clears __draft — so corrections edit
  // the real submitted values). The consent signature is always re-entered.
  const draft = draftFields(stage);
  const payload = (stage?.payload ?? {}) as { jurisdictions?: string[]; declarations?: string | null };

  return (
    <StageShell type="CRIMINAL" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <form action={submitCriminalStage} className="space-y-6">
        {/* FCRA / DPDP consent — dossier consent record. */}
        <section className="rounded-2xl border border-dashed border-brand/40 bg-accent/30 p-5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-brand [&>svg]:h-3.5 [&>svg]:w-3.5">
              <ShieldCheck />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Consent Record · FCRA / DPDP
            </span>
          </div>
          <h3 className="mt-3 font-display text-base font-semibold">Disclosure &amp; Authorization</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            I authorize ElvixIT and its background verification partners to obtain a consumer report on
            me for employment-related purposes. I understand the report may contain information about my
            criminal record, employment history, and education, and that I am entitled to a copy upon
            request. I confirm the information I provide is accurate.
          </p>

          <div className="hairline my-5" aria-hidden />

          <FieldGrid>
            <Field label="Jurisdictions lived in (last 7 years)" htmlFor="jurisdictions" required hint="Comma-separated city, state, country.">
              <Textarea id="jurisdictions" name="jurisdictions" required rows={3} defaultValue={draft.jurisdictions ?? payload.jurisdictions?.join(", ") ?? ""} />
            </Field>
            <Field label="Disclosures (anything you want us to know up front)" htmlFor="declarations">
              <Textarea id="declarations" name="declarations" rows={3} defaultValue={draft.declarations ?? payload.declarations ?? ""} />
            </Field>
          </FieldGrid>

          {/* Signature line — emphasized like a wet-ink endorsement. */}
          <div className="mt-5 rounded-xl border border-dashed bg-card p-4">
            <div className="flex items-center gap-2">
              <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-brand [&>svg]:h-3.5 [&>svg]:w-3.5">
                <PenLine />
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Signature
              </span>
            </div>
            <div className="mt-3">
              <Field label="Sign with your full legal name" htmlFor="consentName" required>
                <Input id="consentName" name="consentName" required placeholder="Full legal name" defaultValue={draft.consentName ?? ""} />
              </Field>
            </div>
            <label htmlFor="consentAcknowledged" className="mt-4 flex items-start gap-2 text-sm">
              <input id="consentAcknowledged" name="consentAcknowledged" type="checkbox" required className="mt-0.5 h-4 w-4" defaultChecked={draft.consentAcknowledged === "on"} />
              <span>
                I have read and authorize the consumer report disclosure above.{" "}
                <span className="text-destructive">*</span>
              </span>
            </label>
          </div>
        </section>

        <StageFormFooter stageType="CRIMINAL" submitLabel="Submit criminal stage" />
      </form>
    </StageShell>
  );
}

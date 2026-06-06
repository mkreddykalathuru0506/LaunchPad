import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { FileField } from "@/components/stage/fields";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitPhotoStage } from "@/server/actions/stage";
import { draftFiles } from "@/lib/stage-draft";
import { Camera } from "lucide-react";

export default async function PhotoStagePage({ searchParams }: { searchParams?: { err?: string; saved?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "PHOTO") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({ where: { stageId: stage.id, decision: "NEEDS_CORRECTION" }, orderBy: { createdAt: "desc" }, include: { reviewer: true } })
    : null;
  const savedSelfie = draftFiles(stage).selfie;

  return (
    <StageShell type="PHOTO" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <form action={submitPhotoStage} className="space-y-6">
        {/* Capture checklist — numbered mono dossier card. */}
        <section className="rounded-2xl border border-dashed p-5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-brand [&>svg]:h-3.5 [&>svg]:w-3.5">
              <Camera />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Capture Checklist
            </span>
          </div>
          <ol className="mt-4 space-y-3">
            {[
              "Find a well-lit area with a plain background.",
              "Remove glasses, hats, and masks.",
              "Look straight at the camera, neutral expression.",
              "Capture from the chest up.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-[10px] font-semibold tabnum text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <FileField name="selfie" label="Live selfie" accept="image/*"
          hint="On mobile, your camera will open. On desktop, upload a recent selfie photo." />
        {savedSelfie && (
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground">Saved in draft: <span className="font-medium text-foreground">{savedSelfie.filename}</span> · re-select only to replace.</p>
        )}
        <StageFormFooter stageType="PHOTO" submitLabel="Submit photo stage" />
      </form>
    </StageShell>
  );
}

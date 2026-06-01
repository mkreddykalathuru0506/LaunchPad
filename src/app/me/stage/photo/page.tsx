import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { FileField } from "@/components/stage/fields";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitPhotoStage } from "@/server/actions/stage";
import { draftFiles } from "@/lib/stage-draft";

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
        <ol className="ml-5 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Find a well-lit area with a plain background.</li>
          <li>Remove glasses, hats, and masks.</li>
          <li>Look straight at the camera, neutral expression.</li>
          <li>Capture from the chest up.</li>
        </ol>
        <FileField name="selfie" label="Live selfie" accept="image/*"
          hint="On mobile, your camera will open. On desktop, upload a recent selfie photo." />
        {savedSelfie && (
          <p className="text-sm text-muted-foreground">Saved in your draft: <span className="font-medium">{savedSelfie.filename}</span>. Re-select only if you want to replace it.</p>
        )}
        <StageFormFooter stageType="PHOTO" submitLabel="Submit photo stage" />
      </form>
    </StageShell>
  );
}

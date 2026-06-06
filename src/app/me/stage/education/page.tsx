import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { EducationForm } from "./education-form";
import {
  composeInitial, draftFields, draftFiles, educationInitialFromRecords,
} from "@/lib/stage-draft";

export default async function EducationStagePage({ searchParams }: { searchParams?: { err?: string; saved?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "EDUCATION") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({
        where: { stageId: stage.id, decision: "NEEDS_CORRECTION" },
        orderBy: { createdAt: "desc" },
        include: { reviewer: true },
      })
    : null;

  // In-flight draft wins; otherwise prefill from the submitted rows (a
  // successful submit clears __draft so corrections edit real data).
  const initial = composeInitial(
    { fields: draftFields(stage), files: draftFiles(stage) },
    educationInitialFromRecords(cand?.case?.educations ?? [], cand?.case?.documents ?? []),
  );

  return (
    <StageShell type="EDUCATION" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <EducationForm initial={initial} />
    </StageShell>
  );
}

import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { EducationForm } from "./education-form";

export default async function EducationStagePage() {
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

  return (
    <StageShell type="EDUCATION" stage={stage} lastCorrection={lastCorrection}>
      <EducationForm />
    </StageShell>
  );
}

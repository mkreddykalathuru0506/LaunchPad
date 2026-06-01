import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { ReferenceForm } from "./reference-form";

export default async function ReferenceStagePage({ searchParams }: { searchParams?: { err?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "REFERENCE") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({
        where: { stageId: stage.id, decision: "NEEDS_CORRECTION" },
        orderBy: { createdAt: "desc" },
        include: { reviewer: true },
      })
    : null;

  return (
    <StageShell type="REFERENCE" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined}>
      <ReferenceForm />
    </StageShell>
  );
}

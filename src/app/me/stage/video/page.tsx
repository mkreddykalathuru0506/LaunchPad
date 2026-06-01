import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { FileField, Field } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitVideoStage } from "@/server/actions/stage";

function phraseFor(seed: string) {
  const words = ["amber", "harbor", "violet", "anchor", "pelican", "river", "summit", "cedar"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `${words[h % words.length]} ${words[(h >> 3) % words.length]} ${words[(h >> 6) % words.length]}`;
}

export default async function VideoStagePage({ searchParams }: { searchParams?: { err?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "VIDEO") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({ where: { stageId: stage.id, decision: "NEEDS_CORRECTION" }, orderBy: { createdAt: "desc" }, include: { reviewer: true } })
    : null;
  const phrase = phraseFor(session.user.id);

  return (
    <StageShell type="VIDEO" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined}>
      <form action={submitVideoStage} className="space-y-6">
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="font-semibold">Read this phrase aloud while recording:</div>
          <div className="mt-2 text-lg tracking-wide">"{phrase}"</div>
          <p className="mt-3 text-xs text-muted-foreground">
            Hold your photo ID next to your face while reading. Recording must be 10–30 seconds.
          </p>
          <input type="hidden" name="phrase" value={phrase} />
        </div>
        <FileField name="recording" label="Upload your recording" accept="video/*"
          hint="MP4 / MOV / WebM. Max 200 MB." />
        <div className="flex justify-end">
          <SubmitButton>Submit video stage</SubmitButton>
        </div>
      </form>
    </StageShell>
  );
}

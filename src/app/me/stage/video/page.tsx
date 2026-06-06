import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { FileField, Field } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitVideoStage } from "@/server/actions/stage";
import { draftFiles } from "@/lib/stage-draft";

function phraseFor(seed: string) {
  const words = ["amber", "harbor", "violet", "anchor", "pelican", "river", "summit", "cedar"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `${words[h % words.length]} ${words[(h >> 3) % words.length]} ${words[(h >> 6) % words.length]}`;
}

export default async function VideoStagePage({ searchParams }: { searchParams?: { err?: string; saved?: string } }) {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "VIDEO") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({ where: { stageId: stage.id, decision: "NEEDS_CORRECTION" }, orderBy: { createdAt: "desc" }, include: { reviewer: true } })
    : null;
  const phrase = phraseFor(session.user.id);
  const savedRecording = draftFiles(stage).recording;

  return (
    <StageShell type="VIDEO" stage={stage} lastCorrection={lastCorrection} error={typeof searchParams?.err === "string" ? searchParams.err : undefined} saved={searchParams?.saved === "1"}>
      <form action={submitVideoStage} className="space-y-6">
        {/* Liveness phrase — passport-style read-aloud card. */}
        <section className="rounded-2xl border border-dashed p-5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Liveness Phrase · Read Aloud
          </span>
          <div className="mt-3 rounded-xl border border-dashed bg-secondary/40 px-4 py-3 font-display text-xl font-semibold tracking-wide">
            &ldquo;{phrase}&rdquo;
          </div>
          <ol className="mt-4 space-y-3">
            {[
              "Hold your photo ID next to your face while reading.",
              "Recording must be 10–30 seconds.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-[10px] font-semibold tabnum text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <input type="hidden" name="phrase" value={phrase} />
        </section>
        <FileField name="recording" label="Upload your recording" accept="video/*"
          hint="MP4 / MOV / WebM. Max 200 MB." />
        {savedRecording && (
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground">Saved in draft: <span className="font-medium text-foreground">{savedRecording.filename}</span> · re-select only to replace.</p>
        )}
        <StageFormFooter stageType="VIDEO" submitLabel="Submit video stage" />
      </form>
    </StageShell>
  );
}

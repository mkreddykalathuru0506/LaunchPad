"use client";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveStageDraft } from "@/server/actions/stage";
import { StageType } from "@prisma/client";

/**
 * Shared form footer for every BGV stage: a "Save draft" button (posts to the
 * generic saveStageDraft action, skipping HTML5 validation so partial input is
 * allowed) and the real Submit button. The hidden __stage field tells the draft
 * action which stage it is. Render only when the stage is still editable.
 */
export function StageFormFooter({
  stageType,
  submitLabel,
}: {
  stageType: StageType;
  submitLabel: string;
}) {
  return (
    <>
      <input type="hidden" name="__stage" value={stageType} />
      <div className="flex flex-col gap-3 border-t border-dashed pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            formAction={saveStageDraft}
            formNoValidate
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-ring sm:w-auto"
          >
            Save draft
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            drafts keep your progress
          </span>
        </div>
        <SubmitButton variant="brand" size="lg">{submitLabel}</SubmitButton>
      </div>
    </>
  );
}

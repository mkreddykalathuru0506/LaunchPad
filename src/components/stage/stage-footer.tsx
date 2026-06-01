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
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          formAction={saveStageDraft}
          formNoValidate
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-ring"
        >
          Save draft
        </button>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </>
  );
}

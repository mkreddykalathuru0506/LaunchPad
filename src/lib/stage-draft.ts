// Helpers to read a saved draft (written by saveStageDraft) off a Stage's
// payload, for prefilling the stage form when the candidate returns.

type WithPayload = { payload?: unknown } | null | undefined;

type Draft = {
  fields?: Record<string, string>;
  files?: Record<string, { id: string; filename: string }>;
};

function draft(stage: WithPayload): Draft {
  return ((stage?.payload as Record<string, unknown> | undefined)?.__draft as Draft | undefined) ?? {};
}

/** Saved text field values, keyed by form field name. */
export function draftFields(stage: WithPayload): Record<string, string> {
  return draft(stage).fields ?? {};
}

/** Saved uploaded documents, keyed by form file-field name. */
export function draftFiles(stage: WithPayload): Record<string, { id: string; filename: string }> {
  return draft(stage).files ?? {};
}

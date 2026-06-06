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

// ---------------------------------------------------------------------------
// Record-derived prefill. A successful submit clears __draft (so stale draft
// values stop shadowing what was actually submitted) — these builders map the
// submitted DB rows back into the same {fields, files} shape the forms read,
// so a NEEDS_CORRECTION re-edit still opens a filled form.
// ---------------------------------------------------------------------------

type DraftShape = {
  fields: Record<string, string>;
  files: Record<string, { id: string; filename: string }>;
};

/** yyyy-MM-dd for <input type="date"> defaultValue, "" when absent/invalid. */
export function isoDateValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function fileRef(
  docId: string | null | undefined,
  docNames: Map<string, string>,
): { id: string; filename: string } | undefined {
  return docId ? { id: docId, filename: docNames.get(docId) ?? "uploaded document" } : undefined;
}

function docNameMap(documents: Array<{ id: string; filename: string }>): Map<string, string> {
  return new Map(documents.map((d) => [d.id, d.filename]));
}

// Must match the fixed slots EducationForm renders (extras follow from index 3).
const EDU_REQUIRED_ORDER = ["SSC", "Intermediate", "Bachelor"];

export function educationInitialFromRecords(
  educations: Array<{
    level: string; board: string | null; institution: string; degree: string;
    fieldOfStudy: string | null; rollNumber: string | null;
    startDate: Date; endDate: Date | null;
    gpa: string | null; registrarEmail: string | null;
    transcriptDocId: string | null; degreeDocId: string | null;
  }>,
  documents: Array<{ id: string; filename: string }>,
): DraftShape {
  const names = docNameMap(documents);
  const fields: DraftShape["fields"] = {};
  const files: DraftShape["files"] = {};

  const fill = (i: number, e: (typeof educations)[number]) => {
    const set = (k: string, v: string | null | undefined) => {
      if (v) fields[`edu_${i}_${k}`] = v;
    };
    set("level", e.level);
    set("degree", e.degree);
    set("board", e.board);
    set("institution", e.institution);
    set("field", e.fieldOfStudy);
    set("roll", e.rollNumber);
    set("startDate", isoDateValue(e.startDate));
    set("endDate", isoDateValue(e.endDate));
    set("gpa", e.gpa);
    set("registrar", e.registrarEmail);
    const t = fileRef(e.transcriptDocId, names);
    if (t) files[`edu_${i}_transcript`] = t;
    const d = fileRef(e.degreeDocId, names);
    if (d) files[`edu_${i}_degreeDoc`] = d;
  };

  EDU_REQUIRED_ORDER.forEach((level, i) => {
    const e = educations.find((x) => x.level === level);
    if (e) fill(i, e);
  });
  educations
    .filter((e) => !EDU_REQUIRED_ORDER.includes(e.level))
    .forEach((e, j) => fill(EDU_REQUIRED_ORDER.length + j, e));

  return { fields, files };
}

export function employmentInitialFromRecords(
  employments: Array<{
    employer: string; title: string; employmentType: string;
    startDate: Date; endDate: Date | null; isCurrent: boolean;
    managerName: string | null; managerEmail: string | null; managerPhone: string | null;
    reasonForLeaving: string | null;
    offerLetterDocId: string | null; relievingDocId: string | null; payslipDocId: string | null;
  }>,
  documents: Array<{ id: string; filename: string }>,
): DraftShape {
  const names = docNameMap(documents);
  const fields: DraftShape["fields"] = {};
  const files: DraftShape["files"] = {};

  employments.forEach((e, i) => {
    const set = (k: string, v: string | null | undefined) => {
      if (v) fields[`emp_${i}_${k}`] = v;
    };
    set("employer", e.employer);
    set("title", e.title);
    set("type", e.employmentType);
    set("startDate", isoDateValue(e.startDate));
    set("endDate", isoDateValue(e.endDate));
    if (e.isCurrent) fields[`emp_${i}_isCurrent`] = "on";
    set("mgrName", e.managerName);
    set("mgrEmail", e.managerEmail);
    set("mgrPhone", e.managerPhone);
    set("reason", e.reasonForLeaving);
    const offer = fileRef(e.offerLetterDocId, names);
    if (offer) files[`emp_${i}_offer`] = offer;
    const rel = fileRef(e.relievingDocId, names);
    if (rel) files[`emp_${i}_relieving`] = rel;
    const pay = fileRef(e.payslipDocId, names);
    if (pay) files[`emp_${i}_payslip`] = pay;
  });

  return { fields, files };
}

/**
 * Compose the form's `initial` value: an in-flight draft wins (it is the
 * candidate's current editing cycle, including intentionally cleared fields);
 * otherwise fall back to the submitted records. Files merge so previously
 * submitted uploads keep their "Saved" hint during a new editing cycle.
 */
export function composeInitial(draftShape: DraftShape, fromRecords: DraftShape): DraftShape {
  return {
    fields: Object.keys(draftShape.fields).length > 0 ? draftShape.fields : fromRecords.fields,
    files: { ...fromRecords.files, ...draftShape.files },
  };
}

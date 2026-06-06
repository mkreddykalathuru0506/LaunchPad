"use client";
import { useState } from "react";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { submitEducationStage } from "@/server/actions/stage";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GraduationCap } from "lucide-react";

type LevelKey = "SSC" | "Intermediate" | "Bachelor" | "Master" | "Diploma" | "PhD" | "Certification";

export type EducationDraft = {
  fields: Record<string, string>;
  files: Record<string, { id: string; filename: string }>;
};

const REQUIRED_LEVELS: { key: LevelKey; title: string; subtitle: string; degreePlaceholder: string; boardPlaceholder: string; institutionPlaceholder: string; fieldPlaceholder: string }[] = [
  {
    key: "SSC",
    title: "SSC / 10th",
    subtitle: "Secondary School Certificate — mandatory.",
    degreePlaceholder: "10th / SSC",
    boardPlaceholder: "CBSE / ICSE / State Board",
    institutionPlaceholder: "School name (e.g., St. Joseph's High School)",
    fieldPlaceholder: "—",
  },
  {
    key: "Intermediate",
    title: "Intermediate / 12th",
    subtitle: "Higher Secondary / +2 — mandatory.",
    degreePlaceholder: "12th / Intermediate",
    boardPlaceholder: "CBSE / State Board / Council",
    institutionPlaceholder: "Junior college / school name",
    fieldPlaceholder: "Stream (MPC / BiPC / Commerce / Arts)",
  },
  {
    key: "Bachelor",
    title: "Degree / Graduation",
    subtitle: "Undergraduate degree — mandatory.",
    degreePlaceholder: "B.Tech / B.Sc / B.Com / B.A. / BBA",
    boardPlaceholder: "University name (e.g., Osmania University)",
    institutionPlaceholder: "College name",
    fieldPlaceholder: "Specialization (CSE / ECE / Finance / …)",
  },
];

const OPTIONAL_LEVELS: { key: LevelKey; title: string }[] = [
  { key: "Master", title: "Post-Graduation (M.Tech / M.Sc / MBA / …)" },
  { key: "Diploma", title: "Diploma" },
  { key: "PhD", title: "PhD" },
  { key: "Certification", title: "Certification" },
];

function EducationBlock({
  i, level, title, subtitle, degreePlaceholder, boardPlaceholder, institutionPlaceholder, fieldPlaceholder, isRequired, onRemove, draft,
}: {
  i: number;
  level: LevelKey;
  title: string;
  subtitle?: string;
  degreePlaceholder: string;
  boardPlaceholder: string;
  institutionPlaceholder: string;
  fieldPlaceholder: string;
  isRequired: boolean;
  onRemove?: () => void;
  draft?: EducationDraft;
}) {
  const f = (k: string) => draft?.fields[`edu_${i}_${k}`] ?? "";
  const savedTranscript = draft?.files[`edu_${i}_transcript`];
  const savedDegree = draft?.files[`edu_${i}_degreeDoc`];
  return (
    <section className="rounded-2xl border border-dashed p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Entry {String(i + 1).padStart(2, "0")}
            </span>
            <div className="font-display text-sm font-semibold">{title} {isRequired && <span className="text-destructive">*</span>}</div>
            {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
        {!isRequired && onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label="Remove">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <input type="hidden" name={`edu_${i}_level`} value={level} />

      <FieldGrid>
        <Field label="Degree / Standard" htmlFor={`edu_${i}_degree`} required>
          <Input id={`edu_${i}_degree`} name={`edu_${i}_degree`} placeholder={degreePlaceholder} required defaultValue={f("degree")} />
        </Field>
        <Field label={level === "SSC" || level === "Intermediate" ? "Board" : "University"} htmlFor={`edu_${i}_board`} required>
          <Input id={`edu_${i}_board`} name={`edu_${i}_board`} placeholder={boardPlaceholder} required defaultValue={f("board")} />
        </Field>
        <Field label={level === "SSC" ? "School" : level === "Intermediate" ? "School / Junior college" : "College"} htmlFor={`edu_${i}_institution`} required className="sm:col-span-2">
          <Input id={`edu_${i}_institution`} name={`edu_${i}_institution`} placeholder={institutionPlaceholder} required defaultValue={f("institution")} />
        </Field>
        {level !== "SSC" && (
          <Field label={level === "Intermediate" ? "Stream" : "Specialization"} htmlFor={`edu_${i}_field`} required={level === "Intermediate" || level === "Bachelor"}>
            <Input id={`edu_${i}_field`} name={`edu_${i}_field`} placeholder={fieldPlaceholder} required={level === "Intermediate" || level === "Bachelor"} defaultValue={f("field")} />
          </Field>
        )}
        <Field label="Hall ticket / Roll / Registration number" htmlFor={`edu_${i}_roll`} required>
          <Input id={`edu_${i}_roll`} name={`edu_${i}_roll`} required defaultValue={f("roll")} />
        </Field>
        <Field label="Start year" htmlFor={`edu_${i}_startDate`} required>
          <Input id={`edu_${i}_startDate`} name={`edu_${i}_startDate`} type="date" required defaultValue={f("startDate")} />
        </Field>
        <Field label="Year of passing" htmlFor={`edu_${i}_endDate`} required>
          <Input id={`edu_${i}_endDate`} name={`edu_${i}_endDate`} type="date" required defaultValue={f("endDate")} />
        </Field>
        <Field label="Percentage / CGPA" htmlFor={`edu_${i}_gpa`} required>
          <Input id={`edu_${i}_gpa`} name={`edu_${i}_gpa`} placeholder="e.g., 86.4% or 8.6 CGPA" required defaultValue={f("gpa")} />
        </Field>
        <Field label="Registrar / Principal email" htmlFor={`edu_${i}_registrar`} hint="We may email the institution to verify.">
          <Input id={`edu_${i}_registrar`} name={`edu_${i}_registrar`} type="email" defaultValue={f("registrar")} />
        </Field>
        <FileField name={`edu_${i}_transcript`} label="Marksheet / consolidated marks memo (optional)" accept="image/*,.pdf"
          hint={savedTranscript ? `Saved: ${savedTranscript.filename}. Re-select to replace.` : `Optional. PDF, JPG, or PNG. Max 20 MB.`} />
        <FileField name={`edu_${i}_degreeDoc`} label={`${level === "SSC" || level === "Intermediate" ? "Passing certificate" : "Provisional / Degree certificate"} (optional)`} accept="image/*,.pdf"
          hint={savedDegree ? `Saved: ${savedDegree.filename}. Re-select to replace.` : "Optional. PDF, JPG, or PNG. Max 20 MB."} />
      </FieldGrid>
    </section>
  );
}

export function EducationForm({ initial }: { initial?: EducationDraft }) {
  // Restore any optional levels (index >= the 3 required) that were saved.
  // Scan every saved level key rather than walking sequentially — a gap must
  // not truncate the restore and drop later rows.
  const restoredExtras: LevelKey[] = Object.entries(initial?.fields ?? {})
    .flatMap(([k, v]) => {
      const m = k.match(/^edu_(\d+)_level$/);
      return m ? [[Number(m[1]), v] as const] : [];
    })
    .filter(([i]) => i >= REQUIRED_LEVELS.length)
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v as LevelKey);
  const [extras, setExtras] = useState<LevelKey[]>(restoredExtras);

  const addExtra = (lvl: LevelKey) => setExtras((cur) => [...cur, lvl]);
  const removeExtra = (idxInExtras: number) =>
    setExtras((cur) => cur.filter((_, i) => i !== idxInExtras));

  return (
    <form action={submitEducationStage} className="space-y-6">
      {/* Verification scope — info dossier card. */}
      <section className="rounded-2xl border border-dashed border-brand/40 bg-accent/30 p-4">
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-brand [&>svg]:h-3.5 [&>svg]:w-3.5">
            <GraduationCap />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            India Education Verification
          </span>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          SSC (10th), Intermediate (12th), and Degree details are mandatory. Uploading the
          marksheet and the passing/degree certificate is optional.
        </p>
      </section>

      {REQUIRED_LEVELS.map((l, idx) => (
        <EducationBlock
          key={l.key}
          i={idx}
          level={l.key}
          title={l.title}
          subtitle={l.subtitle}
          degreePlaceholder={l.degreePlaceholder}
          boardPlaceholder={l.boardPlaceholder}
          institutionPlaceholder={l.institutionPlaceholder}
          fieldPlaceholder={l.fieldPlaceholder}
          isRequired
          draft={initial}
        />
      ))}

      {extras.map((lvl, idxInExtras) => {
        const i = REQUIRED_LEVELS.length + idxInExtras;
        const meta = OPTIONAL_LEVELS.find((o) => o.key === lvl)!;
        return (
          <EducationBlock
            key={`${lvl}-${idxInExtras}`}
            i={i}
            level={lvl}
            title={meta.title}
            degreePlaceholder="e.g., M.Tech / MBA / Diploma in …"
            boardPlaceholder="University / Board"
            institutionPlaceholder="College / Institution name"
            fieldPlaceholder="Specialization"
            isRequired={false}
            onRemove={() => removeExtra(idxInExtras)}
            draft={initial}
          />
        );
      })}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed p-4">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Add Another Qualification
        </span>
        {OPTIONAL_LEVELS.map((o) => (
          <Button key={o.key} type="button" variant="outline" size="sm" onClick={() => addExtra(o.key)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {o.title}
          </Button>
        ))}
      </div>

      <StageFormFooter stageType="EDUCATION" submitLabel="Submit education stage" />
    </form>
  );
}

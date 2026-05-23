"use client";
import { useState } from "react";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitEducationStage } from "@/server/actions/stage";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GraduationCap } from "lucide-react";

type LevelKey = "SSC" | "Intermediate" | "Bachelor" | "Master" | "Diploma" | "PhD" | "Certification";

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
  i, level, title, subtitle, degreePlaceholder, boardPlaceholder, institutionPlaceholder, fieldPlaceholder, isRequired, onRemove,
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
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">{title} {isRequired && <span className="text-destructive">*</span>}</div>
            {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
        {!isRequired && onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input type="hidden" name={`edu_${i}_level`} value={level} />

      <FieldGrid>
        <Field label="Degree / Standard" htmlFor={`edu_${i}_degree`} required>
          <Input id={`edu_${i}_degree`} name={`edu_${i}_degree`} placeholder={degreePlaceholder} required />
        </Field>
        <Field label={level === "SSC" || level === "Intermediate" ? "Board" : "University"} htmlFor={`edu_${i}_board`} required>
          <Input id={`edu_${i}_board`} name={`edu_${i}_board`} placeholder={boardPlaceholder} required />
        </Field>
        <Field label={level === "SSC" ? "School" : level === "Intermediate" ? "School / Junior college" : "College"} htmlFor={`edu_${i}_institution`} required className="sm:col-span-2">
          <Input id={`edu_${i}_institution`} name={`edu_${i}_institution`} placeholder={institutionPlaceholder} required />
        </Field>
        {level !== "SSC" && (
          <Field label={level === "Intermediate" ? "Stream" : "Specialization"} htmlFor={`edu_${i}_field`} required={level === "Intermediate" || level === "Bachelor"}>
            <Input id={`edu_${i}_field`} name={`edu_${i}_field`} placeholder={fieldPlaceholder} required={level === "Intermediate" || level === "Bachelor"} />
          </Field>
        )}
        <Field label="Hall ticket / Roll / Registration number" htmlFor={`edu_${i}_roll`} required>
          <Input id={`edu_${i}_roll`} name={`edu_${i}_roll`} required />
        </Field>
        <Field label="Start year" htmlFor={`edu_${i}_startDate`} required>
          <Input id={`edu_${i}_startDate`} name={`edu_${i}_startDate`} type="date" required />
        </Field>
        <Field label="Year of passing" htmlFor={`edu_${i}_endDate`} required>
          <Input id={`edu_${i}_endDate`} name={`edu_${i}_endDate`} type="date" required />
        </Field>
        <Field label="Percentage / CGPA" htmlFor={`edu_${i}_gpa`} required>
          <Input id={`edu_${i}_gpa`} name={`edu_${i}_gpa`} placeholder="e.g., 86.4% or 8.6 CGPA" required />
        </Field>
        <Field label="Registrar / Principal email" htmlFor={`edu_${i}_registrar`} hint="We may email the institution to verify.">
          <Input id={`edu_${i}_registrar`} name={`edu_${i}_registrar`} type="email" />
        </Field>
        <FileField name={`edu_${i}_transcript`} label="Marksheet / consolidated marks memo" accept="image/*,.pdf"
          hint={`Required. PDF, JPG, or PNG. Max 20 MB.`} />
        <FileField name={`edu_${i}_degreeDoc`} label={level === "SSC" || level === "Intermediate" ? "Passing certificate" : "Provisional / Degree certificate"} accept="image/*,.pdf"
          hint="Required." />
      </FieldGrid>
    </div>
  );
}

export function EducationForm() {
  const [extras, setExtras] = useState<LevelKey[]>([]);
  const blocks: { key: LevelKey; index: number; required: boolean }[] = [
    ...REQUIRED_LEVELS.map((l, idx) => ({ key: l.key, index: idx, required: true })),
    ...extras.map((k, idx) => ({ key: k, index: REQUIRED_LEVELS.length + idx, required: false })),
  ];

  const addExtra = (lvl: LevelKey) => setExtras((cur) => [...cur, lvl]);
  const removeExtra = (idxInExtras: number) =>
    setExtras((cur) => cur.filter((_, i) => i !== idxInExtras));

  return (
    <form action={submitEducationStage} className="space-y-6">
      <div className="rounded-md border border-primary/30 bg-accent/40 p-3 text-sm">
        <div className="font-medium">India education verification</div>
        <p className="mt-0.5 text-muted-foreground">
          SSC (10th), Intermediate (12th), and Degree details are mandatory. Each section requires the
          marksheet and the passing/degree certificate.
        </p>
      </div>

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
          />
        );
      })}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
        <span className="text-sm text-muted-foreground">Add another qualification:</span>
        {OPTIONAL_LEVELS.map((o) => (
          <Button key={o.key} type="button" variant="outline" size="sm" onClick={() => addExtra(o.key)}>
            <Plus className="h-3.5 w-3.5" /> {o.title}
          </Button>
        ))}
      </div>

      <div className="flex justify-end">
        <SubmitButton>Submit education stage</SubmitButton>
      </div>
    </form>
  );
}

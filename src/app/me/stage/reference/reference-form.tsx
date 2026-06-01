"use client";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { Repeatable } from "@/components/stage/repeatable";
import { submitReferenceStage } from "@/server/actions/stage";

export type ReferenceDraft = {
  fields: Record<string, string>;
  files: Record<string, { id: string; filename: string }>;
};

function rowCount(fields: Record<string, string> | undefined, marker: (i: number) => string): number {
  let n = 0;
  while (fields && fields[marker(n)] !== undefined) n++;
  return n;
}

export function ReferenceForm({ initial }: { initial?: ReferenceDraft }) {
  const v = (i: number, k: string) => initial?.fields[`ref_${i}_${k}`] ?? "";
  const count = rowCount(initial?.fields, (i) => `ref_${i}_name`);

  return (
    <form action={submitReferenceStage} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Provide at least two professional references (former managers preferred).
      </p>
      <Repeatable
        label="Reference"
        initialCount={Math.max(2, count)}
        renderItem={(i) => (
          <FieldGrid>
            <Field label="Full name" htmlFor={`ref_${i}_name`} required>
              <Input id={`ref_${i}_name`} name={`ref_${i}_name`} required defaultValue={v(i, "name")} />
            </Field>
            <Field label="Relationship" htmlFor={`ref_${i}_relationship`} required>
              <Input
                id={`ref_${i}_relationship`}
                name={`ref_${i}_relationship`}
                required
                placeholder="Former manager / Colleague"
                defaultValue={v(i, "relationship")}
              />
            </Field>
            <Field label="Employer" htmlFor={`ref_${i}_employer`}>
              <Input id={`ref_${i}_employer`} name={`ref_${i}_employer`} defaultValue={v(i, "employer")} />
            </Field>
            <Field label="Email" htmlFor={`ref_${i}_email`} required>
              <Input id={`ref_${i}_email`} name={`ref_${i}_email`} type="email" required defaultValue={v(i, "email")} />
            </Field>
            <Field label="Phone" htmlFor={`ref_${i}_phone`}>
              <Input id={`ref_${i}_phone`} name={`ref_${i}_phone`} defaultValue={v(i, "phone")} />
            </Field>
            <Field label="Years known" htmlFor={`ref_${i}_years`}>
              <Input id={`ref_${i}_years`} name={`ref_${i}_years`} type="number" min={0} max={50} defaultValue={v(i, "years")} />
            </Field>
          </FieldGrid>
        )}
      />
      <StageFormFooter stageType="REFERENCE" submitLabel="Submit references" />
    </form>
  );
}

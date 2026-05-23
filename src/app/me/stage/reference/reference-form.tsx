"use client";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Repeatable } from "@/components/stage/repeatable";
import { submitReferenceStage } from "@/server/actions/stage";

export function ReferenceForm() {
  return (
    <form action={submitReferenceStage} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Provide at least two professional references (former managers preferred).
      </p>
      <Repeatable
        label="Reference"
        initialCount={2}
        renderItem={(i) => (
          <FieldGrid>
            <Field label="Full name" htmlFor={`ref_${i}_name`} required>
              <Input id={`ref_${i}_name`} name={`ref_${i}_name`} required />
            </Field>
            <Field label="Relationship" htmlFor={`ref_${i}_relationship`} required>
              <Input
                id={`ref_${i}_relationship`}
                name={`ref_${i}_relationship`}
                required
                placeholder="Former manager / Colleague"
              />
            </Field>
            <Field label="Employer" htmlFor={`ref_${i}_employer`}>
              <Input id={`ref_${i}_employer`} name={`ref_${i}_employer`} />
            </Field>
            <Field label="Email" htmlFor={`ref_${i}_email`} required>
              <Input id={`ref_${i}_email`} name={`ref_${i}_email`} type="email" required />
            </Field>
            <Field label="Phone" htmlFor={`ref_${i}_phone`}>
              <Input id={`ref_${i}_phone`} name={`ref_${i}_phone`} />
            </Field>
            <Field label="Years known" htmlFor={`ref_${i}_years`}>
              <Input id={`ref_${i}_years`} name={`ref_${i}_years`} type="number" min={0} max={50} />
            </Field>
          </FieldGrid>
        )}
      />
      <div className="flex justify-end">
        <SubmitButton>Submit references</SubmitButton>
      </div>
    </form>
  );
}

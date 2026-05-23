"use client";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Repeatable } from "@/components/stage/repeatable";
import { submitEmploymentStage } from "@/server/actions/stage";

export function EmploymentForm() {
  return (
    <form action={submitEmploymentStage} className="space-y-6">
      <Repeatable
        label="Employment"
        initialCount={1}
        renderItem={(i) => (
          <FieldGrid>
            <Field label="Employer" htmlFor={`emp_${i}_employer`} required>
              <Input id={`emp_${i}_employer`} name={`emp_${i}_employer`} required />
            </Field>
            <Field label="Job title" htmlFor={`emp_${i}_title`} required>
              <Input id={`emp_${i}_title`} name={`emp_${i}_title`} required />
            </Field>
            <Field label="Type" htmlFor={`emp_${i}_type`} required>
              <select
                id={`emp_${i}_type`}
                name={`emp_${i}_type`}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-ring"
              >
                <option>FullTime</option>
                <option>PartTime</option>
                <option>Contract</option>
                <option>Intern</option>
              </select>
            </Field>
            <Field label="Currently working" htmlFor={`emp_${i}_isCurrent`}>
              <label className="inline-flex h-10 items-center gap-2 text-sm">
                <input id={`emp_${i}_isCurrent`} name={`emp_${i}_isCurrent`} type="checkbox" className="h-4 w-4" />
                Yes
              </label>
            </Field>
            <Field label="Start date" htmlFor={`emp_${i}_startDate`} required>
              <Input id={`emp_${i}_startDate`} name={`emp_${i}_startDate`} type="date" required />
            </Field>
            <Field label="End date" htmlFor={`emp_${i}_endDate`}>
              <Input id={`emp_${i}_endDate`} name={`emp_${i}_endDate`} type="date" />
            </Field>
            <Field label="Manager name" htmlFor={`emp_${i}_mgrName`}>
              <Input id={`emp_${i}_mgrName`} name={`emp_${i}_mgrName`} />
            </Field>
            <Field label="Manager email" htmlFor={`emp_${i}_mgrEmail`}>
              <Input id={`emp_${i}_mgrEmail`} name={`emp_${i}_mgrEmail`} type="email" />
            </Field>
            <Field label="Manager phone" htmlFor={`emp_${i}_mgrPhone`}>
              <Input id={`emp_${i}_mgrPhone`} name={`emp_${i}_mgrPhone`} />
            </Field>
            <Field label="Reason for leaving" htmlFor={`emp_${i}_reason`} className="sm:col-span-2">
              <Textarea id={`emp_${i}_reason`} name={`emp_${i}_reason`} rows={2} />
            </Field>
            <FileField name={`emp_${i}_offer`} label="Offer letter" accept="image/*,.pdf" />
            <FileField name={`emp_${i}_relieving`} label="Relieving / experience letter" accept="image/*,.pdf" />
            <FileField name={`emp_${i}_payslip`} label="Last payslip / Form-16 / W-2" accept="image/*,.pdf" />
          </FieldGrid>
        )}
      />
      <div className="flex justify-end">
        <SubmitButton>Submit employment stage</SubmitButton>
      </div>
    </form>
  );
}

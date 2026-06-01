"use client";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StageFormFooter } from "@/components/stage/stage-footer";
import { Repeatable } from "@/components/stage/repeatable";
import { submitEmploymentStage } from "@/server/actions/stage";

export type EmploymentDraft = {
  fields: Record<string, string>;
  files: Record<string, { id: string; filename: string }>;
};

// Count the leading sequential rows saved in a draft (by their required marker).
function rowCount(fields: Record<string, string> | undefined, marker: (i: number) => string): number {
  let n = 0;
  while (fields && fields[marker(n)] !== undefined) n++;
  return n;
}

export function EmploymentForm({ initial }: { initial?: EmploymentDraft }) {
  const v = (i: number, k: string) => initial?.fields[`emp_${i}_${k}`] ?? "";
  const file = (i: number, k: string) => initial?.files[`emp_${i}_${k}`];
  const count = rowCount(initial?.fields, (i) => `emp_${i}_employer`);

  return (
    <form action={submitEmploymentStage} className="space-y-6">
      <Repeatable
        label="Employment"
        initialCount={Math.max(1, count)}
        renderItem={(i) => (
          <FieldGrid>
            <Field label="Employer" htmlFor={`emp_${i}_employer`} required>
              <Input id={`emp_${i}_employer`} name={`emp_${i}_employer`} required defaultValue={v(i, "employer")} />
            </Field>
            <Field label="Job title" htmlFor={`emp_${i}_title`} required>
              <Input id={`emp_${i}_title`} name={`emp_${i}_title`} required defaultValue={v(i, "title")} />
            </Field>
            <Field label="Type" htmlFor={`emp_${i}_type`} required>
              <select
                id={`emp_${i}_type`}
                name={`emp_${i}_type`}
                required
                defaultValue={v(i, "type") || "FullTime"}
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
                <input id={`emp_${i}_isCurrent`} name={`emp_${i}_isCurrent`} type="checkbox" className="h-4 w-4" defaultChecked={v(i, "isCurrent") === "on"} />
                Yes
              </label>
            </Field>
            <Field label="Start date" htmlFor={`emp_${i}_startDate`} required>
              <Input id={`emp_${i}_startDate`} name={`emp_${i}_startDate`} type="date" required defaultValue={v(i, "startDate")} />
            </Field>
            <Field label="End date" htmlFor={`emp_${i}_endDate`}>
              <Input id={`emp_${i}_endDate`} name={`emp_${i}_endDate`} type="date" defaultValue={v(i, "endDate")} />
            </Field>
            <Field label="Manager name" htmlFor={`emp_${i}_mgrName`}>
              <Input id={`emp_${i}_mgrName`} name={`emp_${i}_mgrName`} defaultValue={v(i, "mgrName")} />
            </Field>
            <Field label="Manager email" htmlFor={`emp_${i}_mgrEmail`}>
              <Input id={`emp_${i}_mgrEmail`} name={`emp_${i}_mgrEmail`} type="email" defaultValue={v(i, "mgrEmail")} />
            </Field>
            <Field label="Manager phone" htmlFor={`emp_${i}_mgrPhone`}>
              <Input id={`emp_${i}_mgrPhone`} name={`emp_${i}_mgrPhone`} defaultValue={v(i, "mgrPhone")} />
            </Field>
            <Field label="Reason for leaving" htmlFor={`emp_${i}_reason`} className="sm:col-span-2">
              <Textarea id={`emp_${i}_reason`} name={`emp_${i}_reason`} rows={2} defaultValue={v(i, "reason")} />
            </Field>
            <FileField name={`emp_${i}_offer`} label="Offer letter" accept="image/*,.pdf"
              hint={file(i, "offer") ? `Saved: ${file(i, "offer")!.filename}. Re-select to replace.` : undefined} />
            <FileField name={`emp_${i}_relieving`} label="Relieving / experience letter" accept="image/*,.pdf"
              hint={file(i, "relieving") ? `Saved: ${file(i, "relieving")!.filename}. Re-select to replace.` : undefined} />
            <FileField name={`emp_${i}_payslip`} label="Last payslip / Form-16 / W-2" accept="image/*,.pdf"
              hint={file(i, "payslip") ? `Saved: ${file(i, "payslip")!.filename}. Re-select to replace.` : undefined} />
          </FieldGrid>
        )}
      />
      <StageFormFooter stageType="EMPLOYMENT" submitLabel="Submit employment stage" />
    </form>
  );
}

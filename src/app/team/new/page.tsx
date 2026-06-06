import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCase } from "@/server/actions/case";

export default async function NewCase() {
  await requireRole(["MANAGER", "ADMIN"]);
  const verifiers = await db.user.findMany({ where: { role: "VERIFIER", active: true }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="New case" description="Invite a candidate and create their verification case." />
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <form action={createCase} className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                New Case · Candidate Details
              </span>
              <span aria-hidden className="hairline flex-1" />
            </div>
            <FieldGrid>
              <Field label="Candidate email" htmlFor="email" required>
                <Input id="email" name="email" type="email" required />
              </Field>
              <Field label="Candidate name" htmlFor="name" required>
                <Input id="name" name="name" required />
              </Field>
              <Field label="Type" htmlFor="candidateType" required>
                <select id="candidateType" name="candidateType" required
                  className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring">
                  <option value="INTERN">Intern</option>
                  <option value="CANDIDATE">Candidate</option>
                  <option value="TRAINER">Trainer</option>
                  <option value="CONTRACTOR">Contractor</option>
                </select>
              </Field>
              <Field label="Position title" htmlFor="positionTitle" required>
                <Input id="positionTitle" name="positionTitle" required />
              </Field>
              <Field label="Hiring manager" htmlFor="hiringManager">
                <Input id="hiringManager" name="hiringManager" />
              </Field>
              <Field label="Planned start date" htmlFor="startDate">
                <Input id="startDate" name="startDate" type="date" />
              </Field>
              <Field label="Assigned verifier" htmlFor="assignedVerifierId">
                <select id="assignedVerifierId" name="assignedVerifierId"
                  className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring">
                  <option value="">Unassigned</option>
                  {verifiers.map((v) => <option key={v.id} value={v.id}>{v.name ?? v.email}</option>)}
                </select>
              </Field>
              <Field label="Require veteran stage" htmlFor="requireVeteran">
                <label className="inline-flex h-11 items-center gap-2 text-sm">
                  <input id="requireVeteran" name="requireVeteran" type="checkbox" className="h-4 w-4 accent-brand" />
                  Candidate has self-identified as veteran
                </label>
              </Field>
            </FieldGrid>
            <div className="flex justify-end">
              <SubmitButton variant="brand">Create case &amp; send invite</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

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
      <Card>
        <CardContent className="p-6">
          <form action={createCase} className="space-y-6">
            <FieldGrid>
              <Field label="Candidate email" htmlFor="email" required>
                <Input id="email" name="email" type="email" required />
              </Field>
              <Field label="Candidate name" htmlFor="name" required>
                <Input id="name" name="name" required />
              </Field>
              <Field label="Type" htmlFor="candidateType" required>
                <select id="candidateType" name="candidateType" required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-ring">
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-ring">
                  <option value="">Unassigned</option>
                  {verifiers.map((v) => <option key={v.id} value={v.id}>{v.name ?? v.email}</option>)}
                </select>
              </Field>
              <Field label="Require veteran stage" htmlFor="requireVeteran">
                <label className="inline-flex h-10 items-center gap-2 text-sm">
                  <input id="requireVeteran" name="requireVeteran" type="checkbox" className="h-4 w-4" />
                  Candidate has self-identified as veteran
                </label>
              </Field>
            </FieldGrid>
            <div className="flex justify-end">
              <SubmitButton>Create case & send invite</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

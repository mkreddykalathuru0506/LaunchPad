import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { db } from "@/lib/db";
import { StageShell } from "@/components/stage/stage-shell";
import { Field, FieldGrid, FileField } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitIdentityStage } from "@/server/actions/stage";

export default async function IdentityStagePage() {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  const stage = cand?.case?.stages.find((s) => s.type === "IDENTITY") ?? null;
  const lastCorrection = stage
    ? await db.stageReview.findFirst({
        where: { stageId: stage.id, decision: "NEEDS_CORRECTION" },
        orderBy: { createdAt: "desc" },
        include: { reviewer: true },
      })
    : null;
  const readOnly = stage?.status === "APPROVED" || stage?.status === "UNDER_REVIEW" || stage?.status === "SUBMITTED";

  return (
    <StageShell type="IDENTITY" stage={stage} lastCorrection={lastCorrection}>
      <form action={submitIdentityStage} className="space-y-6">
        <FieldGrid>
          <Field label="Legal first name" htmlFor="legalFirstName" required>
            <Input id="legalFirstName" name="legalFirstName" defaultValue={cand?.legalFirstName ?? ""} required readOnly={readOnly} />
          </Field>
          <Field label="Middle name" htmlFor="legalMiddleName">
            <Input id="legalMiddleName" name="legalMiddleName" defaultValue={cand?.legalMiddleName ?? ""} readOnly={readOnly} />
          </Field>
          <Field label="Legal last name" htmlFor="legalLastName" required>
            <Input id="legalLastName" name="legalLastName" defaultValue={cand?.legalLastName ?? ""} required readOnly={readOnly} />
          </Field>
          <Field label="Date of birth" htmlFor="dob" required>
            <Input id="dob" name="dob" type="date" required readOnly={readOnly} />
          </Field>
          <Field label="Nationality" htmlFor="nationality" required>
            <Input id="nationality" name="nationality" defaultValue={cand?.nationality ?? ""} required readOnly={readOnly} />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label="Document type" htmlFor="documentType" required>
            <select id="documentType" name="documentType" required disabled={readOnly}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-ring">
              <option value="PASSPORT">Passport</option>
              <option value="DRIVER_LICENSE">Driver License</option>
              <option value="AADHAAR">Aadhaar (IN)</option>
              <option value="PAN">PAN (IN)</option>
              <option value="SSN">SSN (US)</option>
            </select>
          </Field>
          <Field label="Document number" htmlFor="documentNumber" required hint="Stored encrypted at rest.">
            <Input id="documentNumber" name="documentNumber" required readOnly={readOnly} />
          </Field>
        </FieldGrid>

        <FileField name="idDocument" label="Photo of your ID (front)" accept="image/*,.pdf" hint="Clear, full document. PDF or photo. Max 20 MB." />

        {!readOnly && (
          <div className="flex justify-end">
            <SubmitButton>Submit identity stage</SubmitButton>
          </div>
        )}
      </form>
    </StageShell>
  );
}

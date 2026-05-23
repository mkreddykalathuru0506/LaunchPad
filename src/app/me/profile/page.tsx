import { requireRole } from "@/lib/session";
import { getCaseForCandidate } from "@/server/queries/case";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";

export default async function ProfilePage() {
  const session = await requireRole("CANDIDATE");
  const cand = await getCaseForCandidate(session.user.id);
  return (
    <>
      <PageHeader title="Profile" description="Identity-verified details from your case." />
      <Card>
        <CardHeader><CardTitle>Personal</CardTitle></CardHeader>
        <CardContent>
          <FieldGrid>
            <Field label="Email"><Input value={cand?.user.email ?? ""} readOnly /></Field>
            <Field label="Display name"><Input value={cand?.user.name ?? ""} readOnly /></Field>
            <Field label="Legal first name"><Input value={cand?.legalFirstName ?? ""} readOnly /></Field>
            <Field label="Legal last name"><Input value={cand?.legalLastName ?? ""} readOnly /></Field>
            <Field label="Position"><Input value={cand?.positionTitle ?? ""} readOnly /></Field>
            <Field label="Hiring manager"><Input value={cand?.hiringManager ?? ""} readOnly /></Field>
            <Field label="Start date"><Input value={cand?.startDate?.toLocaleDateString() ?? ""} readOnly /></Field>
            <Field label="Phone"><Input value={cand?.phone ?? ""} readOnly /></Field>
          </FieldGrid>
        </CardContent>
      </Card>
    </>
  );
}

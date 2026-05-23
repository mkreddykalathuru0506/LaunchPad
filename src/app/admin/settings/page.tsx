import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/server/actions/admin";

export default async function SettingsPage() {
  const s = await db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return (
    <>
      <PageHeader title="Settings" description="Branding and SLA defaults." />
      <Card>
        <CardContent className="p-6">
          <form action={updateSettings} className="space-y-4">
            <FieldGrid>
              <Field label="App name" htmlFor="appName"><Input id="appName" name="appName" defaultValue={s.appName} required /></Field>
              <Field label="Brand color" htmlFor="brandColor"><Input id="brandColor" name="brandColor" defaultValue={s.brandColor} required /></Field>
              <Field label="Support email" htmlFor="supportEmail"><Input id="supportEmail" name="supportEmail" type="email" defaultValue={s.supportEmail} required /></Field>
              <Field label="Per-stage SLA (hours)" htmlFor="slaHoursPerStage"><Input id="slaHoursPerStage" name="slaHoursPerStage" type="number" defaultValue={s.slaHoursPerStage} required /></Field>
            </FieldGrid>
            <div className="flex justify-end"><Button type="submit">Save settings</Button></div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

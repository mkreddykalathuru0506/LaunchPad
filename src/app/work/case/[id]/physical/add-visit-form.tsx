"use client";
import { useRef } from "react";
import { Plus } from "lucide-react";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { addPhysicalVisit } from "@/server/actions/physical";

const selectCls =
  "flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring";

export function AddVisitForm({ verificationId }: { verificationId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await addPhysicalVisit(fd);
        formRef.current?.reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="verificationId" value={verificationId} />
      <FieldGrid cols={2}>
        <Field label="Type" htmlFor="kind">
          <select id="kind" name="kind" defaultValue="ADDRESS" className={selectCls}>
            <option value="ADDRESS">Address</option>
            <option value="EDUCATION">Education</option>
            <option value="EMPLOYMENT">Employment</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Label" htmlFor="label" required>
          <Input id="label" name="label" required placeholder="e.g. Permanent address / Osmania University" />
        </Field>
      </FieldGrid>
      <Field label="Site address" htmlFor="addressText">
        <Textarea id="addressText" name="addressText" rows={2} placeholder="Full address the agent will travel to" />
      </Field>
      <FieldGrid cols={3}>
        <Field label="Contact on site" htmlFor="contactName">
          <Input id="contactName" name="contactName" placeholder="Warden / registrar / HR" />
        </Field>
        <Field label="Contact phone" htmlFor="contactPhone">
          <Input id="contactPhone" name="contactPhone" placeholder="Optional" />
        </Field>
        <Field label="Scheduled for" htmlFor="scheduledFor">
          <Input id="scheduledFor" name="scheduledFor" type="datetime-local" />
        </Field>
      </FieldGrid>
      <SubmitButton variant="outline" size="sm">
        <Plus className="h-4 w-4" /> Add visit
      </SubmitButton>
    </form>
  );
}

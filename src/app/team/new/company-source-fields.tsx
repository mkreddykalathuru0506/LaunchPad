"use client";
import * as React from "react";
import { Building2, Send, Mail } from "lucide-react";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Requesting-company filter for manual case creation:
//  - LISTED (ElvixIT portal): company is fixed; verification status + the
//    clearance report are pushed back to the portal automatically. (Portal
//    handoffs normally create these cases automatically via webhook.)
//  - NON-LISTED: manual entry; status + report are emailed back to the
//    company's result address.
export function CompanySourceFields() {
  const [source, setSource] = React.useState<"listed" | "unlisted">("unlisted");

  const option = (value: "listed" | "unlisted", title: string, blurb: string, icon: React.ReactNode) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all",
        source === value
          ? "border-brand/50 bg-brand/5 ring-1 ring-inset ring-brand/30"
          : "border-border bg-muted/30 hover:border-border hover:bg-accent"
      )}
    >
      <input
        type="radio"
        name="companySource"
        value={value}
        checked={source === value}
        onChange={() => setSource(value)}
        className="mt-1 h-4 w-4 accent-brand"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden className={cn("[&>svg]:h-4 [&>svg]:w-4", source === value ? "text-brand" : "text-muted-foreground")}>
            {icon}
          </span>
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{blurb}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Requesting company
        </span>
        <span aria-hidden className="hairline flex-1" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {option(
          "listed",
          "Listed company · ElvixIT",
          "Portal-integrated. Verification status and the clearance report are returned to the company portal automatically.",
          <Send />
        )}
        {option(
          "unlisted",
          "Non-listed company",
          "Manual request. Verification status and the clearance report are emailed back to the company.",
          <Mail />
        )}
      </div>

      {source === "listed" ? (
        <FieldGrid>
          <Field label="Company" htmlFor="companyDisplay">
            <Input id="companyDisplay" value="ElvixIT" readOnly aria-readonly className="bg-muted/50" />
          </Field>
          <Field label="App / product (optional)" htmlFor="appName">
            <Input id="appName" name="appName" placeholder="e.g. ElvixIT Labs" />
          </Field>
        </FieldGrid>
      ) : (
        <FieldGrid>
          <Field label="Company name" htmlFor="companyName" required>
            <Input id="companyName" name="companyName" required placeholder="Requesting company" />
          </Field>
          <Field label="App / product (optional)" htmlFor="appName">
            <Input id="appName" name="appName" placeholder="Optional" />
          </Field>
          <Field
            label="Result email"
            htmlFor="resultEmail"
            required
            hint="Status + signed clearance report are sent to this address."
            className="sm:col-span-2"
          >
            <Input id="resultEmail" name="resultEmail" type="email" required placeholder="hr@company.com" />
          </Field>
        </FieldGrid>
      )}

      <p className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/30 p-3 font-mono text-[11px] leading-relaxed tracking-wide text-muted-foreground">
        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
        {source === "listed"
          ? "On clearance or rejection, the result is pushed to the ElvixIT portal callback."
          : "On clearance, the signed PDF report is attached to the result email; rejections send status only."}
      </p>
    </div>
  );
}

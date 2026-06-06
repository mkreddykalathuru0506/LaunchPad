import * as React from "react";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Field({
  label, htmlFor, hint, className, children, required,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="font-mono text-[11px] tracking-wide text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={cn("grid gap-4", cols === 1 ? "" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>{children}</div>;
}

export function FileField({
  name, label, accept, hint, className,
}: {
  name: string;
  label: string;
  accept?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-input p-4", className)}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
        >
          <Upload className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={name} className="block">
            {label}
          </Label>
          {/* The real <input> stays — name/accept untouched; styled via file: modifiers. */}
          <Input id={name} name={name} type="file" accept={accept} className="h-auto border-0 bg-transparent px-0 py-0 shadow-none" />
          {hint && (
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}

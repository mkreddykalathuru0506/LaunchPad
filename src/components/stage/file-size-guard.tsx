"use client";
import * as React from "react";
import { AlertCircle } from "lucide-react";

/**
 * Blocks submit when the picked file is larger than the stage allows.
 *
 * Why this exists: an oversized upload is killed by the reverse proxy (413)
 * before any server action runs, so `withStageErrors` never sees it and the
 * candidate gets a generic failure — or nothing at all. Checking in the browser
 * turns that into a plain message with the actual file size.
 */
export function FileSizeGuardClient({
  inputId,
  maxBytes,
}: {
  inputId: string;
  maxBytes: number;
}) {
  const [tooBig, setTooBig] = React.useState<{ name: string; size: number } | null>(null);

  React.useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    const form = input.form;

    const check = () => {
      const file = input.files?.[0];
      const over = file && file.size > maxBytes ? { name: file.name, size: file.size } : null;
      setTooBig(over);
      // Native validity keeps the browser's own submit blocking in play, so
      // this works even if the submit handler below is bypassed.
      input.setCustomValidity(over ? "This file is too large." : "");
    };

    const onSubmit = (e: Event) => {
      const file = input.files?.[0];
      if (file && file.size > maxBytes) {
        e.preventDefault();
        e.stopPropagation();
        setTooBig({ name: file.name, size: file.size });
      }
    };

    input.addEventListener("change", check);
    // "Save draft" posts the same file, so guard every submit path on the form.
    form?.addEventListener("submit", onSubmit, true);
    return () => {
      input.removeEventListener("change", check);
      form?.removeEventListener("submit", onSubmit, true);
    };
  }, [inputId, maxBytes]);

  if (!tooBig) return null;

  const mb = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <div>
        <div className="font-medium">That file is too large to upload</div>
        <p className="mt-0.5 text-muted-foreground">
          {tooBig.name} is {mb(tooBig.size)}; the limit is {mb(maxBytes)}. Record a shorter clip or lower
          the resolution in your camera settings — or use &ldquo;Skip for now&rdquo; below and the BGV team
          will follow up.
        </p>
      </div>
    </div>
  );
}

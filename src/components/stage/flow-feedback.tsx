"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Dismissible flow feedback popup driven by URL state.
 *
 * - `error`   → opens an error dialog (title "Couldn't submit — please fix").
 * - `success` → opens a success dialog ("Profile submitted for BGV").
 *
 * On close it strips the relevant query param (?err= / ?submitted=) via
 * router.replace WITHOUT a full navigation, so the underlying (draft-preserved)
 * form keeps the values the candidate already entered.
 */
export function FlowFeedback({ error, success }: { error?: string; success?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const variant: "error" | "success" | null = error ? "error" : success ? "success" : null;
  const [open, setOpen] = React.useState(Boolean(variant));

  // Re-open if a fresh error/success arrives on a subsequent submit.
  React.useEffect(() => {
    setOpen(Boolean(variant));
  }, [variant]);

  function clearParams() {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.delete("err");
    next.delete("submitted");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) clearParams();
  }

  if (!variant) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === "error" ? (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                Couldn&apos;t submit — please fix
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                Profile submitted for BGV
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {variant === "error" ? error : success}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)}>
            {variant === "error" ? "Got it" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

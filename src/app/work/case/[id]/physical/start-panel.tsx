import { MapPinned, Camera, ShieldCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { startPhysicalVerification } from "@/server/actions/physical";

/**
 * The "service not started yet" panel. Explains that physical verification is an
 * OPTIONAL, background field service and offers to start it. Shown both on the
 * case-page tab and on the dedicated workspace before the service exists.
 */
export function StartPhysicalPanel({ caseId, compact = false }: { caseId: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-6">
      <div className="flex items-start gap-4">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <MapPinned className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">Physical (field) verification</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            An <span className="font-medium text-foreground">optional</span>, background service: the BGV field team
            visits the candidate&apos;s addresses, college, and previous employers in person, confirms them on the
            ground, and uploads site photos. It is <span className="font-medium text-foreground">not required</span> for
            clearance and can be run even after the candidate is onboarded.
          </p>

          {!compact && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              <li className="flex items-center gap-2 rounded-xl border bg-card p-3 text-xs">
                <MapPinned className="h-4 w-4 text-brand" aria-hidden /> Visit declared sites
              </li>
              <li className="flex items-center gap-2 rounded-xl border bg-card p-3 text-xs">
                <Camera className="h-4 w-4 text-brand" aria-hidden /> Capture geo-stamped photos
              </li>
              <li className="flex items-center gap-2 rounded-xl border bg-card p-3 text-xs">
                <ShieldCheck className="h-4 w-4 text-brand" aria-hidden /> Record on-ground findings
              </li>
            </ul>
          )}

          <form action={startPhysicalVerification} className="mt-4 space-y-3">
            <input type="hidden" name="caseId" value={caseId} />
            <Textarea
              name="reason"
              rows={2}
              placeholder="Optional: why are we doing a field check? (e.g. address could not be verified online)"
            />
            <SubmitButton variant="brand" size="sm">
              <MapPinned className="h-4 w-4" /> Start field verification
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

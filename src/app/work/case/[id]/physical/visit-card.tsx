"use client";
import { useState } from "react";
import {
  MapPin,
  GraduationCap,
  Briefcase,
  Building2,
  Camera,
  Trash2,
  ClipboardCheck,
  Navigation,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGrid } from "@/components/stage/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { GeoCapture } from "./geo-capture";
import {
  recordVisitOutcome,
  uploadVisitPhotos,
  deleteVisitPhoto,
  deletePhysicalVisit,
} from "@/server/actions/physical";
import {
  physicalVisitKindLabels,
  physicalVisitStatusLabels,
  visitStatusTone,
  formatDateTime,
  cn,
} from "@/lib/utils";
import type { PhysicalVisitKind, PhysicalVisitStatus } from "@prisma/client";

type Photo = {
  id: string;
  caption: string | null;
  filename: string;
  latitude: string | null;
  longitude: string | null;
  createdAt: Date | string;
};
type Visit = {
  id: string;
  kind: PhysicalVisitKind;
  status: PhysicalVisitStatus;
  label: string;
  addressText: string | null;
  contactName: string | null;
  contactPhone: string | null;
  scheduledFor: Date | string | null;
  visitedAt: Date | string | null;
  latitude: string | null;
  longitude: string | null;
  findings: string | null;
  photos: Photo[];
};

const KIND_ICON: Record<PhysicalVisitKind, React.ReactNode> = {
  ADDRESS: <MapPin className="h-4 w-4" />,
  EDUCATION: <GraduationCap className="h-4 w-4" />,
  EMPLOYMENT: <Briefcase className="h-4 w-4" />,
  OTHER: <Building2 className="h-4 w-4" />,
};

const selectCls =
  "flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring";

export function VisitCard({ visit, readOnly = false }: { visit: Visit; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const visitedLocal = toLocalInput(visit.visitedAt);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        visit.status === "DISCREPANCY" && "border-destructive/40",
        visit.status === "VERIFIED" && "border-success/40",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            {KIND_ICON[visit.kind]}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {physicalVisitKindLabels[visit.kind]}
              </span>
            </div>
            <div className="font-medium leading-tight">{visit.label}</div>
            {visit.addressText && <p className="mt-0.5 text-sm text-muted-foreground">{visit.addressText}</p>}
          </div>
        </div>
        <Badge tone={visitStatusTone(visit.status)}>{physicalVisitStatusLabels[visit.status]}</Badge>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {visit.contactName && (
          <span className="inline-flex items-center gap-1">
            <UserIcon className="h-3 w-3" /> {visit.contactName}
          </span>
        )}
        {visit.contactPhone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" /> {visit.contactPhone}
          </span>
        )}
        {visit.visitedAt && <span>Visited {formatDateTime(visit.visitedAt)}</span>}
        {!visit.visitedAt && visit.scheduledFor && <span>Scheduled {formatDateTime(visit.scheduledFor)}</span>}
        {visit.latitude && visit.longitude && (
          <a
            href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-brand hover:underline"
          >
            <Navigation className="h-3 w-3" /> {visit.latitude}, {visit.longitude}
          </a>
        )}
      </div>

      {visit.findings && (
        <p className="mt-3 rounded-xl bg-muted/40 p-3 text-sm">{visit.findings}</p>
      )}

      {/* Photos */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Camera className="h-3.5 w-3.5" /> Site photos · {String(visit.photos.length).padStart(2, "0")}
        </div>
        {visit.photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visit.photos.map((p) => (
              <figure key={p.id} className="group relative overflow-hidden rounded-xl border bg-muted/30">
                <a href={`/api/physical/photo/${p.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/physical/photo/${p.id}`}
                    alt={p.caption ?? p.filename}
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
                {(p.caption || (p.latitude && p.longitude)) && (
                  <figcaption className="truncate px-2 py-1 text-[11px] text-muted-foreground">
                    {p.caption ?? `${p.latitude}, ${p.longitude}`}
                  </figcaption>
                )}
                {!readOnly && (
                  <form action={deleteVisitPhoto} className="absolute right-1.5 top-1.5">
                    <input type="hidden" name="photoId" value={p.id} />
                    <button
                      type="submit"
                      aria-label="Delete photo"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 text-destructive opacity-0 shadow ring-1 ring-border backdrop-blur transition-opacity hover:bg-background group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
            No photos yet.
          </p>
        )}

        {!readOnly && (
          <form action={uploadVisitPhotos} className="mt-3 space-y-2 rounded-xl border border-dashed p-3">
            <input type="hidden" name="visitId" value={visit.id} />
            <Input
              name="photos"
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="h-auto border-0 bg-transparent px-0 py-0 text-xs shadow-none file:mr-3 file:rounded-md file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand"
            />
            <Input name="caption" placeholder="Caption (optional)" className="h-9 text-xs" />
            <GeoCapture />
            <SubmitButton variant="outline" size="sm">
              <Camera className="h-4 w-4" /> Upload photos
            </SubmitButton>
          </form>
        )}
      </div>

      {/* Outcome */}
      {!readOnly && (
        <div className="mt-4 border-t border-dashed pt-3">
          {!editing ? (
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <ClipboardCheck className="h-4 w-4" /> Record outcome
              </Button>
              <form action={deletePhysicalVisit}>
                <input type="hidden" name="visitId" value={visit.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </form>
            </div>
          ) : (
            <form
              action={async (fd) => {
                await recordVisitOutcome(fd);
                setEditing(false); // collapse on success (a thrown error redirects instead)
              }}
              className="space-y-3"
            >
              <input type="hidden" name="visitId" value={visit.id} />
              <FieldGrid cols={2}>
                <Field label="Outcome" htmlFor={`status-${visit.id}`}>
                  <select id={`status-${visit.id}`} name="status" defaultValue={visit.status} className={selectCls}>
                    <option value="PENDING">Pending visit</option>
                    <option value="VERIFIED">Verified on site</option>
                    <option value="DISCREPANCY">Discrepancy</option>
                    <option value="UNABLE_TO_VERIFY">Unable to verify</option>
                  </select>
                </Field>
                <Field label="Visited at" htmlFor={`visitedAt-${visit.id}`}>
                  <Input id={`visitedAt-${visit.id}`} name="visitedAt" type="datetime-local" defaultValue={visitedLocal} />
                </Field>
              </FieldGrid>
              <FieldGrid cols={2}>
                <Field label="Contact met" htmlFor={`contactName-${visit.id}`}>
                  <Input id={`contactName-${visit.id}`} name="contactName" defaultValue={visit.contactName ?? ""} />
                </Field>
                <Field label="Contact phone" htmlFor={`contactPhone-${visit.id}`}>
                  <Input id={`contactPhone-${visit.id}`} name="contactPhone" defaultValue={visit.contactPhone ?? ""} />
                </Field>
              </FieldGrid>
              <Field label="Findings" htmlFor={`findings-${visit.id}`}>
                <Textarea
                  id={`findings-${visit.id}`}
                  name="findings"
                  rows={3}
                  defaultValue={visit.findings ?? ""}
                  placeholder="What did you confirm on the ground? Who did you meet? Any mismatch?"
                />
              </Field>
              <Field label="Location of visit" htmlFor="latitude">
                <GeoCapture defaultLat={visit.latitude ?? ""} defaultLng={visit.longitude ?? ""} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <SubmitButton size="sm" variant="brand">
                  Save outcome
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/** Date → value for <input type="datetime-local"> (local time, no seconds). */
function toLocalInput(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { notifyBgvTeam } from "@/server/notify";
import { ensurePhysicalVerification } from "@/server/physical";
import {
  PhysicalVerificationStatus,
  PhysicalVisitKind,
  PhysicalVisitStatus,
} from "@prisma/client";

// Staff roles that run the field-verification service.
const STAFF = ["VERIFIER", "MANAGER", "ADMIN"] as const;

/**
 * Wrap a field-action body so a thrown validation error redirects back to the
 * workspace with the message in ?err= (rendered inline) instead of hitting the
 * generic error boundary. Next's own redirect()/notFound() control-flow throws
 * carry a NEXT_* digest and are re-thrown untouched.
 */
function withFieldErrors(redirectTo: string, fn: () => Promise<void>) {
  return async (): Promise<void> => {
    try {
      await fn();
    } catch (e) {
      const digest = (e as { digest?: unknown } | null)?.digest;
      if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
        throw e;
      }
      const msg = e instanceof Error && e.message ? e.message : "Could not complete that action.";
      redirect(`${redirectTo}?err=${encodeURIComponent(msg)}`);
    }
  };
}

function workspacePath(caseId: string) {
  return `/work/case/${caseId}/physical`;
}

function revalidatePhysical(caseId: string) {
  revalidatePath(workspacePath(caseId));
  revalidatePath(`/work/case/${caseId}`);
  revalidatePath("/work/physical");
}

async function verificationCaseId(verificationId: string): Promise<string> {
  const pv = await db.physicalVerification.findUnique({
    where: { id: verificationId },
    select: { caseId: true },
  });
  if (!pv) throw new Error("Physical verification not found.");
  return pv.caseId;
}

// ───────────────────────── Start / lifecycle ──────────────────────────

const startSchema = z.object({
  caseId: z.string().min(1),
  reason: z.string().max(2000).optional(),
});

/**
 * Start the optional physical-verification service for a case. Idempotent — if
 * one already exists we just return to the workspace. On first start we seed
 * PENDING field visits from the candidate's declared addresses, colleges, and
 * employers so the field agent has a concrete checklist to work from.
 */
export async function startPhysicalVerification(formData: FormData) {
  const session = await requireRole([...STAFF]);
  const parsed = startSchema.parse({
    caseId: formData.get("caseId"),
    reason: formData.get("reason")?.toString().trim() || undefined,
  });
  const caseId = parsed.caseId;

  await withFieldErrors(workspacePath(caseId), async () => {
    const result = await ensurePhysicalVerification(caseId, {
      origin: "MANUAL",
      reason: parsed.reason ?? null,
      startedById: session.user.id,
      // A verifier starting it picks it up themselves; managers/admins leave it
      // unassigned for the field desk to pick up.
      assignedAgentId: session.user.role === "VERIFIER" ? session.user.id : null,
    });
    if (!result.created) return; // idempotent — already started

    await audit({
      actorId: session.user.id,
      caseId,
      action: "physical.started",
      metadata: { origin: "MANUAL", seededVisits: result.seededVisits },
    });
    await notifyBgvTeam(caseId, {
      kind: "GENERIC",
      title: `Field verification started — ${result.reference}`,
      body: `Physical (on-ground) verification was started with ${result.seededVisits} site(s) to visit.`,
      link: workspacePath(caseId),
    });
  })();

  revalidatePhysical(caseId);
  redirect(workspacePath(caseId));
}

const assignSchema = z.object({
  verificationId: z.string().min(1),
  agentId: z.string().min(1).optional().or(z.literal("")),
});

/** Assign (or clear) the field agent responsible for the visits. */
export async function assignFieldAgent(formData: FormData) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const parsed = assignSchema.parse({
    verificationId: formData.get("verificationId"),
    agentId: formData.get("agentId")?.toString() ?? "",
  });
  const caseId = await verificationCaseId(parsed.verificationId);
  const agentId = parsed.agentId ? parsed.agentId : null;

  await withFieldErrors(workspacePath(caseId), async () => {
    if (agentId) {
      const agent = await db.user.findFirst({
        where: { id: agentId, role: { in: ["VERIFIER", "MANAGER", "ADMIN"] }, active: true },
      });
      if (!agent) throw new Error("That field agent is not available.");
    }
    await db.physicalVerification.update({
      where: { id: parsed.verificationId },
      data: { assignedAgentId: agentId },
    });
    await audit({ actorId: session.user.id, caseId, action: "physical.agent_assigned", metadata: { agentId } });
  })();

  revalidatePhysical(caseId);
}

const completeSchema = z.object({
  verificationId: z.string().min(1),
  summary: z.string().max(4000).optional(),
});

/** Sign off the service — all field work logged, overall conclusion recorded. */
export async function completePhysicalVerification(formData: FormData) {
  const session = await requireRole([...STAFF]);
  const parsed = completeSchema.parse({
    verificationId: formData.get("verificationId"),
    summary: formData.get("summary")?.toString().trim() || undefined,
  });
  const caseId = await verificationCaseId(parsed.verificationId);

  await withFieldErrors(workspacePath(caseId), async () => {
    const pv = await db.physicalVerification.findUnique({
      where: { id: parsed.verificationId },
      include: { visits: { select: { status: true } }, case: { select: { reference: true } } },
    });
    if (!pv) throw new Error("Physical verification not found.");
    if (pv.visits.some((v) => v.status === "PENDING")) {
      throw new Error("Every visit needs an outcome before you can complete the service.");
    }
    await db.physicalVerification.update({
      where: { id: parsed.verificationId },
      data: {
        status: PhysicalVerificationStatus.COMPLETED,
        completedAt: new Date(),
        summary: parsed.summary ?? null,
      },
    });
    await audit({ actorId: session.user.id, caseId, action: "physical.completed" });
    await notifyBgvTeam(caseId, {
      kind: "GENERIC",
      title: `Field verification completed — ${pv.case.reference}`,
      body: `On-ground verification has been signed off across ${pv.visits.length} site(s).`,
      link: workspacePath(caseId),
    });
  })();

  revalidatePhysical(caseId);
}

const cancelSchema = z.object({
  verificationId: z.string().min(1),
  reason: z.string().max(2000).optional(),
});

/** Cancel the service (e.g. portal-triggered in error, or no longer needed). */
export async function cancelPhysicalVerification(formData: FormData) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const parsed = cancelSchema.parse({
    verificationId: formData.get("verificationId"),
    reason: formData.get("reason")?.toString().trim() || undefined,
  });
  const caseId = await verificationCaseId(parsed.verificationId);

  await withFieldErrors(workspacePath(caseId), async () => {
    await db.physicalVerification.update({
      where: { id: parsed.verificationId },
      data: {
        status: PhysicalVerificationStatus.CANCELLED,
        completedAt: new Date(),
        summary: parsed.reason ?? null,
      },
    });
    await audit({ actorId: session.user.id, caseId, action: "physical.cancelled", metadata: { reason: parsed.reason } });
  })();

  revalidatePhysical(caseId);
}

// ───────────────────────────── Visits ─────────────────────────────────

const addVisitSchema = z.object({
  verificationId: z.string().min(1),
  kind: z.nativeEnum(PhysicalVisitKind),
  label: z.string().min(1, "A label is required.").max(200),
  addressText: z.string().max(2000).optional(),
  contactName: z.string().max(160).optional(),
  contactPhone: z.string().max(40).optional(),
  scheduledFor: z.string().optional(),
});

/** Add a site to the field-visit checklist. */
export async function addPhysicalVisit(formData: FormData) {
  await requireRole([...STAFF]);
  const parsed = addVisitSchema.parse({
    verificationId: formData.get("verificationId"),
    kind: formData.get("kind"),
    label: formData.get("label")?.toString().trim(),
    addressText: formData.get("addressText")?.toString().trim() || undefined,
    contactName: formData.get("contactName")?.toString().trim() || undefined,
    contactPhone: formData.get("contactPhone")?.toString().trim() || undefined,
    scheduledFor: formData.get("scheduledFor")?.toString() || undefined,
  });
  const caseId = await verificationCaseId(parsed.verificationId);

  await withFieldErrors(workspacePath(caseId), async () => {
    await db.physicalVisit.create({
      data: {
        verificationId: parsed.verificationId,
        kind: parsed.kind,
        label: parsed.label,
        addressText: parsed.addressText ?? null,
        contactName: parsed.contactName ?? null,
        contactPhone: parsed.contactPhone ?? null,
        scheduledFor: parsed.scheduledFor ? new Date(parsed.scheduledFor) : null,
      },
    });
    // Adding work means the service is actively being worked.
    await db.physicalVerification.updateMany({
      where: { id: parsed.verificationId, status: PhysicalVerificationStatus.REQUESTED },
      data: { status: PhysicalVerificationStatus.IN_PROGRESS },
    });
  })();

  revalidatePhysical(caseId);
}

const outcomeSchema = z.object({
  visitId: z.string().min(1),
  status: z.nativeEnum(PhysicalVisitStatus),
  findings: z.string().max(4000).optional(),
  visitedAt: z.string().optional(),
  contactName: z.string().max(160).optional(),
  contactPhone: z.string().max(40).optional(),
  latitude: z.string().max(40).optional(),
  longitude: z.string().max(40).optional(),
});

/** Record the on-the-ground outcome of a visit. */
export async function recordVisitOutcome(formData: FormData) {
  const session = await requireRole([...STAFF]);
  const parsed = outcomeSchema.parse({
    visitId: formData.get("visitId"),
    status: formData.get("status"),
    findings: formData.get("findings")?.toString().trim() || undefined,
    visitedAt: formData.get("visitedAt")?.toString() || undefined,
    contactName: formData.get("contactName")?.toString().trim() || undefined,
    contactPhone: formData.get("contactPhone")?.toString().trim() || undefined,
    latitude: formData.get("latitude")?.toString().trim() || undefined,
    longitude: formData.get("longitude")?.toString().trim() || undefined,
  });

  const visit = await db.physicalVisit.findUnique({
    where: { id: parsed.visitId },
    select: { verificationId: true },
  });
  if (!visit) throw new Error("Visit not found.");
  const caseId = await verificationCaseId(visit.verificationId);

  await withFieldErrors(workspacePath(caseId), async () => {
    const visitedAt =
      parsed.status === "PENDING"
        ? null
        : parsed.visitedAt
          ? new Date(parsed.visitedAt)
          : new Date();
    await db.physicalVisit.update({
      where: { id: parsed.visitId },
      data: {
        status: parsed.status,
        findings: parsed.findings ?? null,
        visitedAt,
        contactName: parsed.contactName ?? undefined,
        contactPhone: parsed.contactPhone ?? undefined,
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
      },
    });
    await db.physicalVerification.updateMany({
      where: { id: visit.verificationId, status: PhysicalVerificationStatus.REQUESTED },
      data: { status: PhysicalVerificationStatus.IN_PROGRESS },
    });
    await audit({
      actorId: session.user.id,
      caseId,
      action: "physical.visit_outcome",
      metadata: { visitId: parsed.visitId, status: parsed.status },
    });
  })();

  revalidatePhysical(caseId);
}

const deleteVisitSchema = z.object({ visitId: z.string().min(1) });

/** Remove a visit from the checklist (and its photos). */
export async function deletePhysicalVisit(formData: FormData) {
  await requireRole([...STAFF]);
  const parsed = deleteVisitSchema.parse({ visitId: formData.get("visitId") });
  const visit = await db.physicalVisit.findUnique({
    where: { id: parsed.visitId },
    select: { verificationId: true, photos: { select: { storagePath: true } } },
  });
  if (!visit) throw new Error("Visit not found.");
  const caseId = await verificationCaseId(visit.verificationId);

  for (const p of visit.photos) {
    try {
      await storage.remove(p.storagePath);
    } catch (e) {
      logger.warn("physical.photo_remove_failed", { storagePath: p.storagePath, error: String(e) });
    }
  }
  await db.physicalVisit.delete({ where: { id: parsed.visitId } });
  revalidatePhysical(caseId);
}

// ───────────────────────────── Photos ─────────────────────────────────

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB per photo

/** Upload one or more on-site photos for a visit. */
export async function uploadVisitPhotos(formData: FormData) {
  await requireRole([...STAFF]);
  const visitId = formData.get("visitId")?.toString();
  if (!visitId) throw new Error("Missing visit.");
  const caption = formData.get("caption")?.toString().trim() || null;
  const latitude = formData.get("latitude")?.toString().trim() || null;
  const longitude = formData.get("longitude")?.toString().trim() || null;

  const visit = await db.physicalVisit.findUnique({
    where: { id: visitId },
    select: { verificationId: true },
  });
  if (!visit) throw new Error("Visit not found.");
  const caseId = await verificationCaseId(visit.verificationId);

  await withFieldErrors(workspacePath(caseId), async () => {
    const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new Error("Choose at least one photo to upload.");
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error(`"${file.name}" is not an image.`);
      }
      if (file.size > MAX_PHOTO_BYTES) {
        throw new Error(`"${file.name}" is larger than 15 MB.`);
      }
    }
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() ?? "jpg";
      const stored = await storage.put(buf, {
        contentType: file.type || "image/jpeg",
        ext,
        subdir: `${caseId}/physical`,
      });
      await db.physicalVisitPhoto.create({
        data: {
          visitId,
          caption,
          filename: file.name,
          storagePath: stored.storagePath,
          contentType: stored.contentType,
          sizeBytes: stored.size,
          sha256: stored.sha256,
          latitude,
          longitude,
        },
      });
    }
    await db.physicalVerification.updateMany({
      where: { id: visit.verificationId, status: PhysicalVerificationStatus.REQUESTED },
      data: { status: PhysicalVerificationStatus.IN_PROGRESS },
    });
  })();

  revalidatePhysical(caseId);
}

const deletePhotoSchema = z.object({ photoId: z.string().min(1) });

/** Delete an on-site photo. */
export async function deleteVisitPhoto(formData: FormData) {
  await requireRole([...STAFF]);
  const parsed = deletePhotoSchema.parse({ photoId: formData.get("photoId") });
  const photo = await db.physicalVisitPhoto.findUnique({
    where: { id: parsed.photoId },
    select: { storagePath: true, visit: { select: { verificationId: true } } },
  });
  if (!photo) throw new Error("Photo not found.");
  const caseId = await verificationCaseId(photo.visit.verificationId);
  try {
    await storage.remove(photo.storagePath);
  } catch (e) {
    logger.warn("physical.photo_remove_failed", { storagePath: photo.storagePath, error: String(e) });
  }
  await db.physicalVisitPhoto.delete({ where: { id: parsed.photoId } });
  revalidatePhysical(caseId);
}

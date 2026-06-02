import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { StageType, StageStatus, CaseStatus, Role } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const stageLabels: Record<StageType, string> = {
  IDENTITY: "Identity Verification",
  ADDRESS: "Address Verification",
  EDUCATION: "Education Verification",
  EMPLOYMENT: "Employment Verification",
  CRIMINAL: "Criminal Background",
  VETERAN: "Veteran Status",
  PHOTO: "Photo Verification",
  VIDEO: "Video Verification",
  // REFERENCE stage retired — kept here only because the Prisma StageType enum
  // still declares it and Record<StageType, string> requires every key.
  REFERENCE: "Reference Check",
};

export const stageBlurbs: Record<StageType, string> = {
  IDENTITY: "Government-issued ID and personal details.",
  ADDRESS: "Current and permanent address with proof.",
  EDUCATION: "Degrees, institutions, and transcripts.",
  EMPLOYMENT: "Previous employers, roles, and dates.",
  CRIMINAL: "Consent + jurisdictions for record search.",
  VETERAN: "Military service details (if applicable).",
  PHOTO: "Live selfie match against your ID photo.",
  VIDEO: "Recorded or live video identity check.",
  // REFERENCE stage retired — see note on stageLabels above.
  REFERENCE: "Two to three professional references.",
};

export const stageStatusLabels: Record<StageStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  NEEDS_CORRECTION: "Needs correction",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const caseStatusLabels: Record<CaseStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In progress",
  AWAITING_REVIEW: "Awaiting review",
  NEEDS_CORRECTION: "Needs correction",
  CLEARED: "Cleared",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const roleLabels: Record<Role, string> = {
  CANDIDATE: "Candidate",
  VERIFIER: "BG Verifier",
  MANAGER: "BG Manager",
  ADMIN: "Administrator",
};

export function statusTone(s: StageStatus | CaseStatus): "neutral" | "info" | "warn" | "success" | "danger" {
  if (s === "APPROVED" || s === "CLEARED") return "success";
  if (s === "REJECTED") return "danger";
  if (s === "NEEDS_CORRECTION") return "warn";
  if (s === "SUBMITTED" || s === "UNDER_REVIEW" || s === "AWAITING_REVIEW" || s === "IN_PROGRESS") return "info";
  return "neutral";
}

export function progressPercent(stageStatuses: StageStatus[]): number {
  if (stageStatuses.length === 0) return 0;
  const done = stageStatuses.filter((s) => s === "APPROVED").length;
  return Math.round((done / stageStatuses.length) * 100);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]?.toUpperCase()).slice(0, 2).join("");
}

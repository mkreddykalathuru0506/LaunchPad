// Candidate profile export for the company portal.
//
// The portal collects almost nothing about a person directly — the rich profile
// (DOB, address, education, employment history) is what the candidate typed here
// during BGV. The portal has had a receiver for it since its Phase 3 work
// (`docs/integrations/candidate-profile-contract.md` in the portal repo): it
// stores the object as `profile_json` on the candidate row and, once that row is
// linked to a portal user, copies it onto the employee's profile — filling only
// fields the employee hasn't set, never overwriting.
//
// This module is the missing sender half. Two consumers:
//   - the outbound BGV webhook, which now carries `verifiedProfile` on clearance
//   - scripts/backfill-portal-profiles.ts, for people who cleared before this existed
//
// Deliberately NOT exported: documents. The portal contract wants an https URL it
// can fetch server-to-server, but /api/documents/* is NextAuth session-gated, so
// any URL we sent would 401 for the portal. That needs a signed download route
// first — until then we send the structured data only.

import { db } from "@/lib/db";
import { decryptString } from "@/lib/crypto";

/** The portal's `CandidateProfile` shape. Every field is optional — send what we have. */
export type CandidateProfile = {
  dateOfBirth?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  education?: Array<{
    institution?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
    grade?: string;
  }>;
  experience?: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
};

/** `YYYY-MM-DD`, the ISO date the portal parses into a LocalDate. */
function isoDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const t = d.getTime();
  if (Number.isNaN(t)) return undefined;
  return d.toISOString().slice(0, 10);
}

/** DOB is stored as ciphertext; the plaintext is already `YYYY-MM-DD` from the date input. */
function decryptDob(dobEncrypted: string | null | undefined): string | undefined {
  const plain = decryptString(dobEncrypted);
  if (!plain) return undefined;
  const trimmed = plain.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function blankToUndefined(v: string | null | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/** True when the object has at least one meaningful value — used to skip empty sections. */
function hasAnyValue(o: Record<string, unknown>): boolean {
  return Object.values(o).some((v) => v !== undefined && v !== null && v !== "");
}

/**
 * Build the portal profile for a case. Returns null when the candidate has
 * nothing worth sending, so callers can skip the delivery entirely rather than
 * push an empty object the portal would store and propagate as "no data".
 */
export async function buildCandidateProfile(caseId: string): Promise<CandidateProfile | null> {
  const kase = await db.case.findUnique({
    where: { id: caseId },
    select: {
      candidate: { select: { dobEncrypted: true } },
      addresses: {
        select: {
          type: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        },
      },
      educations: {
        select: {
          institution: true,
          degree: true,
          fieldOfStudy: true,
          startDate: true,
          endDate: true,
          gpa: true,
        },
        orderBy: { startDate: "asc" },
      },
      employments: {
        select: {
          employer: true,
          title: true,
          startDate: true,
          endDate: true,
          isCurrent: true,
          reasonForLeaving: true,
        },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!kase) return null;

  const profile: CandidateProfile = {};

  const dateOfBirth = decryptDob(kase.candidate?.dobEncrypted);
  if (dateOfBirth) profile.dateOfBirth = dateOfBirth;

  // Where they live now is what an employee profile means by "address"; fall back
  // to the permanent one when only that was captured.
  const current = kase.addresses.find((a) => a.type === "CURRENT");
  const address = current ?? kase.addresses.find((a) => a.type === "PERMANENT");
  if (address) {
    const mapped = {
      line1: blankToUndefined(address.line1),
      line2: blankToUndefined(address.line2),
      city: blankToUndefined(address.city),
      state: blankToUndefined(address.state),
      country: blankToUndefined(address.country),
      pincode: blankToUndefined(address.postalCode),
    };
    if (hasAnyValue(mapped)) profile.address = mapped;
  }

  const education = kase.educations
    .map((e) => ({
      institution: blankToUndefined(e.institution),
      degree: blankToUndefined(e.degree),
      fieldOfStudy: blankToUndefined(e.fieldOfStudy),
      startYear: e.startDate?.getFullYear(),
      endYear: e.endDate?.getFullYear(),
      // Free text here and on the portal — "8.6 CGPA" / "86.4%" both survive.
      grade: blankToUndefined(e.gpa),
    }))
    .filter(hasAnyValue);
  if (education.length) profile.education = education;

  const experience = kase.employments
    .map((m) => ({
      company: blankToUndefined(m.employer),
      title: blankToUndefined(m.title),
      startDate: isoDate(m.startDate),
      endDate: isoDate(m.endDate),
      current: m.isCurrent,
      description: blankToUndefined(m.reasonForLeaving)
        ? `Reason for leaving: ${m.reasonForLeaving!.trim()}`
        : undefined,
    }))
    .filter((e) => e.company || e.title);
  if (experience.length) profile.experience = experience;

  return Object.keys(profile).length ? profile : null;
}

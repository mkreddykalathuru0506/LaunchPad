// Case reference allocation — the single source of truth for LP-YYYY-NNNN.
//
// Shared by the manager/admin provisioning path (src/server/provision.ts) and
// the portal webhook (src/app/api/webhooks/portal/candidate/route.ts) so the
// collision handling lives in exactly one place. History: provisioning used
// count()+1, which collides with an existing reference the moment any case is
// deleted (the count drops below the max) and 500'd recreate/handoff.

import { db } from "@/lib/db";

const REFERENCE_CREATE_ATTEMPTS = 6;

/**
 * Next free LP-YYYY-NNNN for the current year, derived from the NUMERIC max of
 * existing references — not count(), and not a lexicographic orderBy (which
 * mis-orders once suffixes pass 4 digits: "LP-2026-9999" > "LP-2026-10000").
 * Reads only the reference column for one year's prefix, which stays small at
 * this product's case volume.
 */
export async function generateCaseReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LP-${year}-`;
  const existing = await db.case.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true },
  });
  let max = 0;
  for (const { reference } of existing) {
    const n = parseInt(reference.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/** Increment the numeric suffix of an LP-YYYY-NNNN reference (collision retry). */
export function bumpReference(ref: string): string {
  const m = ref.match(/^(LP-\d{4}-)(\d+)$/);
  if (!m) return `${ref}-1`;
  const prefix = m[1] ?? "";
  const num = parseInt(m[2] ?? "0", 10);
  return `${prefix}${String(num + 1).padStart(4, "0")}`;
}

/** Prisma P2002 (unique constraint violation), any target. */
export function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { code?: string }).code === "P2002";
}

/** P2002 specifically on Case.reference (vs. candidateId / portal keys). */
export function isReferenceCollision(e: unknown): boolean {
  if (!isUniqueViolation(e)) return false;
  const rawTarget = (e as { meta?: { target?: unknown } }).meta?.target ?? [];
  const target = Array.isArray(rawTarget) ? rawTarget.join(",") : String(rawTarget);
  return target.includes("reference");
}

/**
 * Run a case-creating write with a freshly allocated reference, bumping and
 * retrying when the reference itself collides (legacy count()-based refs,
 * deletions, or a concurrent create). Any other error — including P2002 on a
 * different unique (candidateId, portal keys) — propagates to the caller,
 * which may resolve it as an idempotent "already exists".
 */
export async function withUniqueCaseReference<T>(
  create: (reference: string) => Promise<T>,
): Promise<T> {
  let reference = await generateCaseReference();
  for (let attempt = 1; ; attempt++) {
    try {
      return await create(reference);
    } catch (e) {
      if (isReferenceCollision(e) && attempt < REFERENCE_CREATE_ATTEMPTS) {
        reference = bumpReference(reference);
        continue;
      }
      throw e;
    }
  }
}

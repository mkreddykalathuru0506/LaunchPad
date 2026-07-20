/**
 * One-off backfill: push every candidate's profile to the company portal.
 *
 * The outbound BGV webhook now carries `verifiedProfile` on clearance, but that
 * only helps cases cleared from here on. Everyone who onboarded before it existed
 * has an empty portal profile while their real data sits in this database. This
 * script closes that gap by posting each profile to the portal's signed backfill
 * endpoint, which matches by email, stores it, and copies it onto the employee's
 * profile — gaps only, never overwriting what someone already typed.
 *
 * Dry run (default — prints what it WOULD send, contacts nothing):
 *   npx tsx scripts/backfill-portal-profiles.ts
 *
 * Send for real:
 *   npx tsx scripts/backfill-portal-profiles.ts --commit
 *
 * Options:
 *   --only=a@b.com[,c@d.com]   restrict to these launchpad emails (repeatable/CSV)
 *   --map=lp@x.com:portal@y.com   send under a different portal email (people whose
 *                                 portal account uses another address); repeatable
 *   --limit=N                  stop after N candidates
 *
 * Needs DATABASE_URL + ENCRYPTION_KEY (to decrypt DOB) and PORTAL_WEBHOOK_SECRET.
 * Idempotent: re-running sends the same data, and the portal fills only blanks.
 */
import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { buildCandidateProfile } from "../src/server/portal-profile";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const LIMIT = Number(argValue("--limit") ?? "0") || 0;
const ONLY = new Set(
  (argValues("--only").flatMap((v) => v.split(","))).map((e) => e.trim().toLowerCase()).filter(Boolean),
);
const ALIASES = new Map(
  argValues("--map")
    .map((pair) => pair.split(":"))
    .filter((p): p is [string, string] => p.length === 2)
    .map(([from, to]) => [from.trim().toLowerCase(), to.trim()]),
);

function argValue(flag: string): string | undefined {
  return argValues(flag)[0];
}
function argValues(flag: string): string[] {
  return args.filter((a) => a.startsWith(`${flag}=`)).map((a) => a.slice(flag.length + 1));
}

/** Derived from the BGV callback so a staging/localhost portal needs no extra env. */
function portalProfileUrl(): string {
  const explicit = process.env.PORTAL_PROFILE_URL;
  if (explicit) return explicit;
  const callback =
    process.env.PORTAL_BGV_CALLBACK_URL ?? "https://portal.elvixit.com/api/v1/jobs/webhooks/bgv";
  return callback.replace("/jobs/webhooks/bgv", "/jobs/public/candidate-profile-signed");
}

/** Same scheme as apply-signed: hex HMAC-SHA256 of the exact bytes we send. */
function sign(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

/** One-line summary of what a profile actually carries — never prints the values. */
function describe(profile: {
  dateOfBirth?: string;
  address?: object;
  education?: unknown[];
  experience?: unknown[];
}): string {
  const bits = [
    profile.dateOfBirth ? "dob" : null,
    profile.address ? "address" : null,
    profile.education?.length ? `education×${profile.education.length}` : null,
    profile.experience?.length ? `experience×${profile.experience.length}` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(", ") : "nothing";
}

async function main() {
  const url = portalProfileUrl();
  const secret = process.env.PORTAL_WEBHOOK_SECRET ?? "";
  if (COMMIT && !secret) {
    throw new Error("PORTAL_WEBHOOK_SECRET is required to send (omit --commit for a dry run).");
  }

  const cases = await prisma.case.findMany({
    select: {
      id: true,
      reference: true,
      candidate: { select: { user: { select: { email: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `${cases.length} case(s) found. Target: ${url}\n` +
      (COMMIT ? "MODE: committing — profiles will be sent.\n" : "MODE: dry run — nothing will be sent.\n"),
  );

  let considered = 0;
  let sent = 0;
  let empty = 0;
  let failed = 0;

  for (const kase of cases) {
    const lpEmail = kase.candidate?.user?.email?.trim().toLowerCase();
    if (!lpEmail) continue;
    if (ONLY.size && !ONLY.has(lpEmail)) continue;
    if (LIMIT && considered >= LIMIT) break;
    considered++;

    const profile = await buildCandidateProfile(kase.id);
    const portalEmail = ALIASES.get(lpEmail) ?? lpEmail;
    if (!profile) {
      empty++;
      console.log(`  skip  ${lpEmail} (${kase.reference}) — nothing to send`);
      continue;
    }

    const label = portalEmail === lpEmail ? portalEmail : `${lpEmail} → ${portalEmail}`;
    if (!COMMIT) {
      console.log(`  would ${label} (${kase.reference}) — ${describe(profile)}`);
      continue;
    }

    const body = JSON.stringify({ email: portalEmail, profile });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Portal-Signature": sign(secret, body) },
        body,
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      if (!res.ok) {
        failed++;
        console.log(`  FAIL  ${label} (${kase.reference}) — HTTP ${res.status} ${text.slice(0, 160)}`);
        continue;
      }
      sent++;
      console.log(`  sent  ${label} (${kase.reference}) — ${describe(profile)} → ${text.slice(0, 160)}`);
    } catch (e) {
      failed++;
      console.log(
        `  FAIL  ${label} (${kase.reference}) — ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(
    `\nconsidered=${considered} ${COMMIT ? `sent=${sent} failed=${failed}` : "(dry run)"} skipped_empty=${empty}`,
  );
  if (!COMMIT) console.log("Re-run with --commit to deliver.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

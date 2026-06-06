/**
 * One-time data migration: re-seal legacy IDENTITY stage payloads.
 *
 * Older submits stored the candidate's document number in PLAINTEXT inside
 * Stage.payload.documentNumber. New submits store AES-256-GCM ciphertext
 * (documentNumberEncrypted) + a display-safe tail (documentNumberLast4) and
 * staff UIs only ever render the masked tail. This script upgrades existing
 * rows so no plaintext remains at rest.
 *
 * Run (needs DATABASE_URL + ENCRYPTION_KEY in env / .env):
 *   npx tsx scripts/encrypt-legacy-identity-payloads.ts
 *
 * Idempotent: rows already migrated (no plaintext documentNumber) are skipped.
 */
import { PrismaClient } from "@prisma/client";
import { encryptString } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  const stages = await prisma.stage.findMany({
    where: { type: "IDENTITY" },
    select: { id: true, payload: true },
  });

  let migrated = 0;
  for (const s of stages) {
    const payload = (s.payload ?? {}) as Record<string, unknown>;
    const plain = payload.documentNumber;
    if (typeof plain !== "string" || plain.length === 0) continue;

    const { documentNumber: _drop, ...rest } = payload;
    await prisma.stage.update({
      where: { id: s.id },
      data: {
        payload: {
          ...rest,
          documentNumberEncrypted: encryptString(plain),
          documentNumberLast4: plain.slice(-4),
        },
      },
    });
    migrated++;
  }

  console.log(`IDENTITY payloads scanned: ${stages.length}, re-sealed: ${migrated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

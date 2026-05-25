-- AlterTable — idempotent so we survive prod where this migration was prematurely
-- marked applied via `prisma migrate resolve --applied` while the SQL was never
-- actually run (hot-fixed in prod 2026-05-25 with ALTER TABLE ADD COLUMN IF NOT
-- EXISTS). Without IF NOT EXISTS, re-running this migration (e.g. on a cloned
-- DB) would crash on "column already exists".
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "portalCandidateKind" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "portalCandidateId" TEXT;

-- CreateIndex (same IF NOT EXISTS treatment)
CREATE UNIQUE INDEX IF NOT EXISTS "Case_portalCandidateKind_portalCandidateId_key"
  ON "Case"("portalCandidateKind", "portalCandidateId")
  WHERE "portalCandidateKind" IS NOT NULL;

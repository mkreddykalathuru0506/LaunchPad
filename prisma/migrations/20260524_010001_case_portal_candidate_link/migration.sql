-- AlterTable
ALTER TABLE "Case" ADD COLUMN "portalCandidateKind" TEXT;
ALTER TABLE "Case" ADD COLUMN "portalCandidateId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Case_portalCandidateKind_portalCandidateId_key"
  ON "Case"("portalCandidateKind", "portalCandidateId")
  WHERE "portalCandidateKind" IS NOT NULL;

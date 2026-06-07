-- Requesting-company source on Case: LISTED companies arrive via the portal
-- webhook (status + report returned to the portal automatically); NON-LISTED
-- companies are created manually and get status + report emailed back.
ALTER TABLE "Case" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Case" ADD COLUMN "appName" TEXT;
ALTER TABLE "Case" ADD COLUMN "resultEmail" TEXT;

-- Backfill: every portal-provisioned case is the listed ElvixIT integration.
UPDATE "Case" SET "companyName" = 'ElvixIT' WHERE "portalCandidateKind" IS NOT NULL;

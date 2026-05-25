-- Adds the two columns Team L1 introduced for the candidate-credentials
-- login flow. Written with IF NOT EXISTS so this migration is idempotent on
-- DBs where the columns were already patched in via direct DDL
-- (prod was hot-fixed on 2026-05-25 with ALTER TABLE ADD COLUMN IF NOT EXISTS
-- after L1's `prisma db push`-only change shipped without a real migration).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "bodyHtml" TEXT;

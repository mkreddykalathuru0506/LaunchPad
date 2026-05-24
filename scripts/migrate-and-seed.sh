#!/usr/bin/env sh
# Idempotent migrate + seed runner for Launchpad.
#
# Handles three database states cleanly:
#   1. Fresh DB (no tables)                -> migrate deploy applies everything.
#   2. Existing DB created via `prisma db push` (legacy prod state) where the
#      schema is already at the target shape but `_prisma_migrations` does
#      not exist -> baseline by marking the current migration as applied,
#      then run migrate deploy (no-op on first pass).
#   3. Already-baselined DB -> migrate deploy is a no-op if nothing pending,
#      or applies new migrations normally.
#
# Re-runs of this script are safe / no-ops on a healthy DB.

set -eu

log() {
  printf '[migrate] %s\n' "$*"
}

# The first migration that was authored after the legacy db-push prod DB was
# created. If you add more migrations later, this constant stays the same —
# it only matters for the one-time baseline step.
BASELINE_MIGRATION="20260524_010001_case_portal_candidate_link"

if [ -z "${DATABASE_URL:-}" ]; then
  log "DATABASE_URL is not set; aborting"
  exit 1
fi

log "Checking whether _prisma_migrations table exists"
# `-tAc` -> tuples-only, unaligned, command. Empty output = no row.
# `|| true` so a transient psql error doesn't kill the script before we can
# log it; we re-check the value below.
HAS_TABLE=$(psql "$DATABASE_URL" -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations'" \
  2>/dev/null || true)

if [ -z "$HAS_TABLE" ]; then
  log "_prisma_migrations not found — baselining existing DB at $BASELINE_MIGRATION"
  # `migrate resolve --applied` is idempotent on its own, but we only reach
  # here when the table doesn't exist, so it will create the bookkeeping
  # table and insert one row marking the migration as applied without
  # running its SQL. The schema is presumed to already match.
  npx prisma migrate resolve --applied "$BASELINE_MIGRATION"
else
  log "_prisma_migrations exists — skipping baseline"
fi

log "Running prisma migrate deploy"
npx prisma migrate deploy

log "Running prisma generate"
npx prisma generate

log "Running seed (prisma/seed.ts)"
npx tsx prisma/seed.ts

log "Done"

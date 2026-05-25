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

# Baseline the legacy migration. We used to gate this on a psql check for
# `_prisma_migrations`, but the host/credentials path the script uses sometimes
# disagrees with what Prisma itself sees (different schema search_path, etc.),
# so the gate would say "no table, baseline!" and then prisma would say "P3008
# already applied" and the script would die. Just attempt the resolve and
# swallow P3008 as a no-op — idempotent both ways.
log "Baseline-resolving legacy migration (P3008 = already-applied is a no-op)"
if out=$(npx prisma migrate resolve --applied "$BASELINE_MIGRATION" 2>&1); then
  log "  marked $BASELINE_MIGRATION as applied"
elif printf '%s' "$out" | grep -q "P3008\|already recorded as applied"; then
  log "  $BASELINE_MIGRATION already applied — skipping"
else
  log "  ERROR resolving $BASELINE_MIGRATION:"
  printf '%s\n' "$out"
  exit 1
fi

log "Running prisma migrate deploy"
npx prisma migrate deploy

log "Running prisma generate"
npx prisma generate

log "Running seed (prisma/seed.ts)"
npx tsx prisma/seed.ts

log "Done"

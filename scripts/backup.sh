#!/usr/bin/env bash
# Launch Pad — daily backup. Dumps DB and tars uploads volume.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups
STAMP=$(date -u +%Y%m%d-%H%M%S)

DB_USER="${POSTGRES_USER:-launchpad}"
DB_NAME="${POSTGRES_DB:-launchpad}"

echo "▸ dumping database → backups/launchpad-${STAMP}.sql.gz"
docker exec launchpad-db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists \
  | gzip -9 > "backups/launchpad-${STAMP}.sql.gz"

echo "▸ tarring uploads volume → backups/uploads-${STAMP}.tar.gz"
docker run --rm \
  -v launchpad_launchpad-uploads:/data:ro \
  -v "$(pwd)/backups:/backup" \
  alpine:3 \
  tar czf "/backup/uploads-${STAMP}.tar.gz" -C /data .

echo "▸ pruning backups older than 30 days"
find backups -type f -name "launchpad-*.sql.gz" -mtime +30 -delete
find backups -type f -name "uploads-*.tar.gz"   -mtime +30 -delete

ls -lh backups | tail -10
echo "── backup complete ────────────────────────────"

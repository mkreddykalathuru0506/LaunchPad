#!/usr/bin/env bash
# Launch Pad — production deploy. Idempotent.
# Run on the VPS as the `deploy` user:  cd /opt/launchpad && ./scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "── Launch Pad deploy starting ────────────────────────────"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill in production values." >&2
  exit 1
fi

# Snapshot the currently running web image so we can roll back in seconds.
if docker image inspect launchpad-web:latest >/dev/null 2>&1; then
  echo "▸ tagging current image as :previous (rollback safety net)"
  docker tag launchpad-web:latest launchpad-web:previous
fi

echo "▸ git fetch + fast-forward"
git fetch --tags --prune origin
git reset --hard origin/main

echo "▸ building web image"
docker compose build web

echo "▸ running migrations + seed (one-shot)"
docker compose --profile tools run --rm migrate

echo "▸ rolling out web, caddy, db"
docker compose up -d --remove-orphans

echo "▸ pruning dangling images"
docker image prune -f >/dev/null || true

echo "▸ status:"
docker compose ps

echo "── Launch Pad deploy complete ────────────────────────────"

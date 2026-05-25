#!/usr/bin/env bash
# Launch Pad — production deploy. Idempotent.
# Run on the VPS as the deploy user:  cd /opt/launchpad && ./scripts/deploy.sh
#
# Set LP_COMPOSE_FILES to a colon-separated list to override the compose-file
# selection. Defaults to docker-compose.yml only (standalone with Caddy via
# `--profile standalone`). For shared-caddy deployment:
#   LP_COMPOSE_FILES="docker-compose.yml:docker-compose.shared-caddy.yml"
set -euo pipefail

cd "$(dirname "$0")/.."

echo "── Launch Pad deploy starting ────────────────────────────"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill in production values." >&2
  exit 1
fi

LP_COMPOSE_FILES="${LP_COMPOSE_FILES:-docker-compose.yml}"
COMPOSE_ARGS=()
IFS=":" read -r -a _files <<< "$LP_COMPOSE_FILES"
for f in "${_files[@]}"; do COMPOSE_ARGS+=( -f "$f" ); done
DC=( docker compose "${COMPOSE_ARGS[@]}" )

# Snapshot the currently running web image so we can roll back in seconds.
if docker image inspect launchpad-web:latest >/dev/null 2>&1; then
  echo "▸ tagging current image as :previous (rollback safety net)"
  docker tag launchpad-web:latest launchpad-web:previous
fi

echo "▸ git fetch + fast-forward"
git fetch --tags --prune origin
git reset --hard origin/main

echo "▸ building web + migrate images"
# Build BOTH services so the migrate container has the current schema.prisma.
# (Previously only web was rebuilt; stale migrate images caused `prisma db push`
# to see the wrong schema and try to drop newly-added columns. 2026-05-25.)
"${DC[@]}" build web
"${DC[@]}" --profile tools build migrate

echo "▸ running migrations + seed (one-shot)"
"${DC[@]}" --profile tools run --rm migrate

echo "▸ rolling out"
"${DC[@]}" up -d --remove-orphans

echo "▸ pruning dangling images"
docker image prune -f >/dev/null || true

echo "▸ status:"
"${DC[@]}" ps

echo "── Launch Pad deploy complete ────────────────────────────"

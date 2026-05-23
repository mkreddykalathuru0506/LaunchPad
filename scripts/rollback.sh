#!/usr/bin/env bash
# Roll the web container back to the previously-tagged image.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker image inspect launchpad-web:previous >/dev/null 2>&1; then
  echo "No :previous image to roll back to." >&2
  exit 1
fi

echo "▸ stopping web"
docker compose stop web

echo "▸ retagging previous → latest"
docker tag launchpad-web:previous launchpad-web:latest

echo "▸ bringing web back up"
docker compose up -d --no-build web

docker compose ps

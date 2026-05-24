# GHCR migration — archived (reverted 2026-05-24)

Launch Pad briefly built+pushed Docker images to GitHub Container Registry
(GHCR) and the VPS pulled them. After ~1 day the three apps on this VPS
(Launch Pad, ElvixIT site, Company Portal) all became noticeably less stable
under the GHCR-pull deploy model, so we reverted Launch Pad back to building
the image **on the VPS** during deploy.

This document is kept so the GHCR setup can be reproduced quickly if/when
we revisit it.

## What was in production

- **Workflow**: `.github/workflows/build-images.yml` (the file lives at
  `docs/archive/build-image.yml.disabled` after this revert).
- **Images pushed**:
  - `ghcr.io/mkreddykalathuru0506/launchpad-web:latest` (and `:<sha>`)
  - `ghcr.io/mkreddykalathuru0506/launchpad-migrate:latest` (and `:<sha>`)
- **VPS pulled** them via `docker compose pull web migrate` inside the
  workflow's `deploy` job, then ran `docker compose run --rm migrate` and
  `docker compose up -d --force-recreate web`.

## GitHub side

- The workflow ran on push to `main` with:
  ```yaml
  permissions:
    contents: read
    packages: write
  ```
  No PAT needed for **pushing** from GHA — the built-in `GITHUB_TOKEN` is
  used: `docker/login-action@v3` with `username: ${{ github.actor }}` and
  `password: ${{ secrets.GITHUB_TOKEN }}`.
- The repo's package settings (Settings → Actions → General →
  "Workflow permissions") must allow **read and write**, otherwise
  `packages: write` is silently downgraded.
- After the first push, the package shows up at
  `https://github.com/users/mkreddykalathuru0506/packages/container/launchpad-web`
  and `…/launchpad-migrate`. Make the package **public** if you want the
  VPS to pull without auth, or keep private and use a PAT (see below).

## VPS side — `docker login ghcr.io`

If packages are kept **private**, the VPS needs a PAT with `read:packages`:

1. Create classic PAT at <https://github.com/settings/tokens>: scope
   `read:packages` only, no expiry (or rotate annually).
2. On the VPS:
   ```bash
   echo "<PAT>" | docker login ghcr.io -u mkreddykalathuru0506 --password-stdin
   ```
   This writes credentials to `/root/.docker/config.json` (root) — they
   persist across reboots.
3. `docker compose pull web migrate` then works inside
   `/opt/launchpad/scripts/deploy.sh` or via SSH from GHA.

If packages are **public** (preferred — no secret on the VPS), skip the
login step entirely.

## Why we reverted

The pull-based flow added a network dependency to deploy (GHCR availability
+ VPS bandwidth) and surfaced as flaky container restarts across all three
co-tenants. Local-build is slower (~2 min vs ~30 s for the pull) but is
self-contained and was rock solid for months prior. Once we have more
headroom we may re-introduce GHCR with proper image-pruning, retry logic
and out-of-band migrate-runs.

## Re-migration recipe (when ready to go back)

1. Restore the archived workflow:
   ```bash
   mv docs/archive/build-image.yml.disabled .github/workflows/build-images.yml
   ```
2. In `docker-compose.yml`, add back to both `web` and `migrate` services
   (above the existing `build:` block):
   ```yaml
       image: ghcr.io/mkreddykalathuru0506/launchpad-web:latest      # web
       image: ghcr.io/mkreddykalathuru0506/launchpad-migrate:latest  # migrate
   ```
   Leave `build:` in place — that's what local builds and what GHA's
   `build-push-action` uses too.
3. Drop the local-build `deploy.yml` (or convert its `script:` block to a
   pull-and-restart instead of `./scripts/deploy.sh`).
4. On the VPS, if private: `docker login ghcr.io …` (see above).
5. Confirm `Settings → Actions → Workflow permissions = Read and write`.
6. Push to `main` — first run is slow (no GHA cache); subsequent runs hit
   `cache-from: type=gha`.

## Files this revert touched

- `.github/workflows/build-images.yml` → `docs/archive/build-image.yml.disabled`
- `.github/workflows/deploy.yml` → restored from `7d4945d^`
- `docker-compose.yml` → removed `image: ghcr.io/...` lines on `web` + `migrate`
- `docker-compose.shared-caddy.yml` → kept as-is (it's the shared-network
  attach overlay and is orthogonal to GHCR)

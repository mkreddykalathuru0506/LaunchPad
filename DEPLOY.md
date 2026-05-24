# Launch Pad — VPS Deployment Runbook

End-to-end deployment of **Launch Pad** to a fresh KVM VPS (Hostinger, DigitalOcean, Linode, Hetzner — anything Ubuntu 22.04 / 24.04). Auto-deploy on `git push origin main` via GitHub Actions.

Stack:

- **Web:** Next.js 14 (standalone output) — port 3000 inside Docker
- **DB:** Postgres 16 — internal-only, no host port published
- **Reverse proxy / TLS:** Caddy 2 — Let's Encrypt automatic
- **Orchestration:** Docker Compose
- **CI/CD:** GitHub Actions (SSH-deploy to VPS on push to `main`)

Throughout this doc replace `yourdomain.com` with your apex and `203.0.113.10` with your VPS IPv4.

---

## 1. Pre-flight

- [ ] VPS provisioned (Ubuntu 22.04 / 24.04 LTS, **min 2 vCPU / 4 GB RAM / 40 GB SSD**).
- [ ] Root SSH key uploaded — `ssh root@203.0.113.10` works from your laptop.
- [ ] DNS records (TTL 600):
  - `A`  `yourdomain.com` → `203.0.113.10`
  - `CNAME`  `www.yourdomain.com` → `yourdomain.com`
  - Verify: `dig +short yourdomain.com @8.8.8.8`
- [ ] Cloud firewall (Hostinger hPanel etc.) allows inbound **22 / 80 / 443**.
- [ ] SMTP credentials ready (Resend API key, or SMTP host/user/pass).

---

## 2. Bootstrap the VPS (one time)

```bash
ssh root@203.0.113.10
apt update && apt upgrade -y

# Non-root user
adduser deploy                       # set a strong password
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Verify before locking down — from a SECOND laptop terminal:
#   ssh deploy@203.0.113.10

# Lock down SSH
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh

# UFW
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw default deny incoming && ufw default allow outgoing
ufw --force enable
```

### Install Docker + Compose

```bash
# As `deploy` (not root)
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
exit                                 # log out + back in so docker group applies
```

### Clone Launch Pad

```bash
ssh deploy@203.0.113.10
sudo mkdir -p /opt/launchpad
sudo chown deploy:deploy /opt/launchpad
git clone https://github.com/mkreddykalathuru0506/LaunchPad.git /opt/launchpad
cd /opt/launchpad
```

---

## 3. Configure production `.env`

```bash
cp .env.example .env
openssl rand -base64 32          # for NEXTAUTH_SECRET
openssl rand -base64 32          # for ENCRYPTION_KEY
nano .env
```

Critical variables:

| Variable | Production value |
|---|---|
| `DATABASE_URL` | `postgresql://launchpad:STRONG_PG_PASSWORD@db:5432/launchpad?schema=public` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Match `DATABASE_URL` above |
| `NEXTAUTH_URL` | `https://yourdomain.com` |
| `NEXTAUTH_SECRET` | First `openssl rand -base64 32` output |
| `ENCRYPTION_KEY` | Second `openssl rand -base64 32` output |
| `APP_URL` | `https://yourdomain.com` |
| `LAUNCHPAD_DOMAIN` | `yourdomain.com` (Caddy reads this) |
| `MAILER_DRIVER` | `resend` (recommended) or `smtp` |
| `RESEND_API_KEY` *or* `SMTP_HOST/PORT/USER/PASS` | Provider credentials |
| `MAILER_FROM` | `"Launch Pad <no-reply@yourdomain.com>"` |
| `STORAGE_DRIVER` | `local` (uploads volume is mounted at `/data/uploads`) |
| `STORAGE_LOCAL_DIR` | `/data/uploads` |
| `ADMIN_EMAIL` | First admin login (e.g. `you@yourdomain.com`) |
| `ADMIN_PASSWORD` | Strong temporary password — change in UI immediately |
| `ADMIN_NAME` | Display name |
| `SEED_DEMO` | leave unset / `false` — production does NOT seed demo data |

```bash
chmod 600 .env
```

---

## 4. Update Caddyfile domain

The Caddyfile reads `LAUNCHPAD_DOMAIN` from the environment. Set it via your shell or in `.env` (Compose will export it). For redundancy, you can also edit Caddyfile to hard-code your domain (replace `{$LAUNCHPAD_DOMAIN:launchpad.local}`).

Verify:

```bash
grep launchpad.local Caddyfile     # should NOT match if you hardcoded
```

---

## 5. First deploy

```bash
cd /opt/launchpad
chmod +x scripts/*.sh

# Build images, run migrations + admin seed, start everything
./scripts/deploy.sh
```

What `deploy.sh` does:

1. Tags the current `launchpad-web:latest` as `:previous` (rollback safety net)
2. `git fetch && reset --hard origin/main`
3. `docker compose build web`
4. `docker compose --profile tools run --rm migrate` (Prisma `db push` + admin seed)
5. `docker compose up -d --remove-orphans`
6. `docker image prune -f`

First run takes ~5 minutes (Next.js build + Let's Encrypt cert issuance).

### Verify

```bash
docker compose ps                       # web, db, caddy all up + healthy
docker compose logs -f caddy            # look for "certificate obtained"
docker compose logs -f web | head -50   # look for "Ready in"
curl https://yourdomain.com/api/health  # {"status":"ok",...}
```

Open `https://yourdomain.com` — green padlock, landing page renders. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## 6. Auto-deploy via GitHub Actions

The workflow at `.github/workflows/deploy.yml` SSHes into your VPS on every push to `main` and runs `./scripts/deploy.sh`. To wire it up:

### 6.1 Create a deploy SSH key (on your VPS, as `deploy`)

```bash
ssh-keygen -t ed25519 -C "gh-actions-launchpad" -f ~/.ssh/gh_deploy -N ""

# Append the public half to the deploy user's authorized_keys
cat ~/.ssh/gh_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Print the PRIVATE key — copy this for the GitHub secret below
cat ~/.ssh/gh_deploy
```

### 6.2 Add GitHub repository secrets

Go to `https://github.com/mkreddykalathuru0506/LaunchPad/settings/secrets/actions` and add:

| Secret | Value |
|---|---|
| `VPS_HOST` | `203.0.113.10` (your VPS IP, or domain) |
| `VPS_USER` | `deploy` |
| `VPS_PORT` | `22` (optional — only if you moved SSH) |
| `VPS_SSH_KEY` | The **private** key printed above (paste the entire `-----BEGIN ... END-----` block) |
| `VPS_DEPLOY_DIR` | `/opt/launchpad` (optional — defaults to this) |

### 6.3 Test

```bash
git commit --allow-empty -m "ci: test auto-deploy" && git push
```

Open `https://github.com/mkreddykalathuru0506/LaunchPad/actions` — the **Deploy to VPS** workflow should run, SSH into the VPS, and complete in ~2–4 minutes (most of which is `docker compose build`).

---

## 7. Day-2 operations

### Manual redeploy

```bash
ssh deploy@203.0.113.10
cd /opt/launchpad && ./scripts/deploy.sh
```

### Rollback

```bash
cd /opt/launchpad && ./scripts/rollback.sh
```

### Backups

```bash
# Run once to verify
./scripts/backup.sh
ls -lh backups/

# Schedule daily at 03:00 UTC
crontab -e
# Add:
0 3 * * * cd /opt/launchpad && ./scripts/backup.sh >> /var/log/launchpad-backup.log 2>&1
```

Backups land in `/opt/launchpad/backups/`. Older than 30 days are auto-pruned. **Sync them off-host** to S3 / Backblaze / Hostinger Object Storage — that protects against losing the VPS itself.

### Logs

```bash
docker compose logs -f web                 # app
docker compose logs -f caddy               # access + ACME
docker compose logs -f db                  # postgres
docker compose logs --since 1h             # everything, last hour
```

Set a log size cap (one time):

```bash
sudo tee /etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }
EOF
sudo systemctl restart docker
docker compose up -d --force-recreate
```

### Restore from backup

```bash
cd /opt/launchpad
docker compose stop web
gunzip -c backups/launchpad-YYYYMMDD-HHMMSS.sql.gz \
  | docker exec -i launchpad-db psql -U launchpad -d launchpad
docker compose up -d web
```

---

## 8. Troubleshooting

### Caddy can't get a cert

1. DNS not propagated → wait, verify `dig +short yourdomain.com @8.8.8.8`
2. Inbound `:80` blocked at cloud firewall or UFW
3. Rate-limited by Let's Encrypt → switch to staging endpoint temporarily

```bash
docker compose restart caddy
docker compose logs -f caddy
```

### `web` in crash loop

```bash
docker compose logs --tail=200 web
```

- `.env` missing `NEXTAUTH_SECRET` / `ENCRYPTION_KEY` / `DATABASE_URL`
- `DATABASE_URL` points at `localhost` (must be `db:5432` inside compose)
- Migrations not run → `docker compose --profile tools run --rm migrate`

### Email never arrives

```bash
docker compose logs web | grep -i email
ls -la /opt/launchpad   # look for `outbox/` if MAILER_DRIVER=filesystem
```

For `resend` driver, check `RESEND_API_KEY` and the `From:` domain is verified in Resend.

### Disk filling up

```bash
df -h
docker system df
docker system prune -af      # safe — removes dangling images + build cache
```

---

## 9. Security hardening (do this after the site is stable)

```bash
sudo apt install -y fail2ban unattended-upgrades
sudo systemctl enable --now fail2ban
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Confirm Postgres is NOT exposed publicly
sudo ss -tlnp | grep 5432    # should be empty (Postgres lives inside Docker network only)

# Rotate secrets yearly: NEXTAUTH_SECRET, ENCRYPTION_KEY, RESEND_API_KEY
```

Optionally restrict SSH to team IPs only:

```bash
sudo ufw delete allow 22/tcp
sudo ufw allow from YOUR.LAPTOP.IP to any port 22 proto tcp
```

---

## 10. What to give Claude when asking for a deploy

To finish wiring auto-deploy I need:

1. **VPS IP** (or domain pointed at it)
2. **Domain** you'll use (so I can substitute it in Caddyfile + DNS check)
3. **One-time confirmation** that the GitHub repository secrets are in place (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`)
4. **SMTP / Resend credentials** — paste these into `.env` on the VPS, do not put them in the repo

I will never store credentials in the repo. The VPS bootstrap (sections 2–5) requires manual interactive commands and should be performed by you. Once steps 2–5 are done, I can validate everything and confirm auto-deploy works end to end.

---

## Deploying (GHCR pull-based)

Images are now built in GitHub Actions (`.github/workflows/build-images.yml`) and published to GitHub Container Registry on every push to `main`:

- `ghcr.io/mkreddykalathuru0506/launchpad-web:latest`
- `ghcr.io/mkreddykalathuru0506/launchpad-migrate:latest`

On the VPS at `/opt/launchpad`:

```bash
docker compose -f docker-compose.yml -f docker-compose.shared-caddy.yml pull web migrate
docker compose run --rm migrate   # prisma migrate deploy + seed
docker compose -f docker-compose.yml -f docker-compose.shared-caddy.yml up -d --force-recreate web
```

Note: `launchpad-web` MUST be brought up with both compose files so it joins `elvixit_default` (the shared Caddy network); otherwise external traffic 502s.

After the first push to `main`, set both `launchpad-web` and `launchpad-migrate` package visibilities to **public** in the GitHub UI (Packages → package settings → Change visibility), so the VPS can `docker pull` without authenticating.

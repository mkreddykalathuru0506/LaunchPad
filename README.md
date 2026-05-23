# Launch Pad — ElivixIT Background Verification

> Multi-stage onboarding and background verification platform for interns, candidates, contractors, and trainers.

Launch Pad replaces the email-and-spreadsheet onboarding flow with one tracked, audited, role-segmented workflow. It collects documents from candidates across nine verification stages and gives the BG team a single place to review, request corrections, and issue final clearance.

The complete product brief is in [`PROMPT.md`](./PROMPT.md).

---

## Quick start

### 1. Prerequisites

- Node.js 18.17+
- pnpm (or npm / yarn — examples below use npm)
- Docker (for the bundled PostgreSQL) — or your own Postgres

### 2. Install

```bash
npm install
```

### 3. Database

Start Postgres with the bundled compose file:

```bash
docker compose up -d
```

Or point `DATABASE_URL` in `.env` at your own Postgres.

### 4. Migrate + seed

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo accounts

Password for all seeded users: `Passw0rd!`

| Role       | Email                       | What you can do                                                |
|------------|-----------------------------|----------------------------------------------------------------|
| Admin      | `admin@elivixit.com`        | Users, audit log, email log, settings                          |
| Manager    | `manager@elivixit.com`      | Team dashboard, create cases, reassign verifiers, clear cases  |
| Verifier   | `verifier1@elivixit.com`    | Review queue, approve / reject / request corrections           |
| Candidate  | `bella@example.com`         | A case in progress with several stages submitted               |
| Candidate  | `deepa@example.com`         | A case with a NEEDS_CORRECTION stage (exercises magic link)    |
| Candidate  | `eric@example.com`          | A fully cleared case (with veteran stage)                      |
| Candidate  | `arjun@example.com`         | A fresh draft case (start from zero)                           |

---

## Routes overview

**Public**
- `/` — marketing landing
- `/login`, `/forgot`, `/redeem/[token]`

**Candidate** (`/me/**`)
- Dashboard, profile, documents
- 9 stage forms: identity, address, education, employment, criminal, veteran, photo, video, reference

**Verifier** (`/work/**`)
- Queue, all-cases listing, full case review with decision controls

**Manager** (`/team/**`)
- Overview, new case, reports

**Admin** (`/admin/**`)
- Users, audit log, email log, settings

---

## How the magic-link correction loop works

1. Verifier opens a case stage and clicks **Request correction** with a comment.
2. Launch Pad creates a single-use `MagicLink` row pointing at that case + stage, valid 7 days.
3. The candidate receives an email with `/redeem/<token>`.
4. Redeeming consumes the token and redirects the candidate straight to the affected stage form.
5. The candidate fixes it, resubmits, and the case goes back into the queue.

Every step writes an `AuditEvent`. Every email is logged in `EmailLog`.

---

## Architecture

```
src/
  app/            Next.js App Router (server components by default)
    (public)      page.tsx, /login, /forgot, /redeem
    me/           candidate portal
    work/         verifier portal
    team/         manager portal
    admin/        admin portal
    api/          REST/handler routes (NextAuth, document download, magic auth)
  components/
    ui/           Headless, shadcn-style primitives (Button, Input, Card, …)
    app/          App shell, header, user menu
    stage/        Stage shell, fields, repeatable
    brand/        Logo
  lib/
    auth.ts       NextAuth config (Credentials + Email)
    db.ts         Prisma client
    session.ts    requireSession / requireRole helpers
    env.ts        Zod-validated env
    mailer.ts     Pluggable mailer (filesystem / console / Resend / SMTP)
    storage.ts    Pluggable storage (local / S3)
    crypto.ts     AES-256-GCM column encryption + SHA-256 + tokens
    rate-limit.ts In-memory token bucket
    audit.ts      Audit event helper
    utils.ts      cn + label maps + status tone helpers
    verifiers/    Adapter interfaces + mocks for Onfido/Persona/Checkr/AuthBridge
    email-templates.ts
  server/
    actions/      Server actions (auth, case, stage submit, review, admin)
    queries/      Read-side query helpers
    pdf/          react-pdf clearance certificate
prisma/
  schema.prisma   Full domain model
  seed.ts         Sample users + cases across all states
```

---

## Swapping mocks for real providers

Every external integration sits behind an adapter interface in `src/lib/verifiers/types.ts`.

### Identity / Photo (Onfido or Persona)

```ts
// src/lib/verifiers/providers/onfido.ts
import type { IdentityVerifier, PhotoVerifier } from "../types";
export const onfidoIdentity: IdentityVerifier = { async verifyDocument(input) { /* call Onfido */ } };
export const onfidoPhoto: PhotoVerifier = { async compareFaces(input) { /* call Onfido */ }, async livenessCheck() {/* ... */} };
```

Then in `src/lib/verifiers/index.ts`:

```ts
import { onfidoIdentity, onfidoPhoto } from "./providers/onfido";
export const identityVerifier = env.ADAPTER_IDENTITY === "onfido" ? onfidoIdentity : mockIdentity;
export const photoVerifier    = env.ADAPTER_PHOTO    === "onfido" ? onfidoPhoto    : mockPhoto;
```

And set `ADAPTER_IDENTITY=onfido` in `.env`.

### Background check (Checkr / HireRight / AuthBridge)

Implement `CriminalVerifier` and `EmploymentVerifier`. Add provider keys to `.env`. Swap the export in `src/lib/verifiers/index.ts`.

### Email (Resend / SMTP)

`MAILER_DRIVER=filesystem` (dev default) writes `*.eml` files into `./outbox/`. Set `MAILER_DRIVER=resend` + `RESEND_API_KEY` for production, or `MAILER_DRIVER=smtp` with SMTP creds.

### Storage (S3)

`STORAGE_DRIVER=local` (dev default) writes to `./uploads/`. The S3 adapter in `src/lib/storage.ts` is a stub — implement with `@aws-sdk/client-s3` and set `S3_*` env vars.

---

## Compliance touchpoints

- **FCRA / DPDP**: criminal stage captures a typed signature + an `accepted` checkbox; the consent record is persisted with timestamp + (when populated) IP + UA.
- **PII at rest**: DOB and military service number columns are encrypted via `lib/crypto.ts` (AES-256-GCM).
- **Append-only audit log**: every state transition, document upload, decision, email send, and magic-link redemption is recorded in `AuditEvent`.
- **Signed document access**: `/api/documents/[path]` enforces session + role + case-ownership.
- **Right-to-erase**: a stub is described in `PROMPT.md` §6 — to implement, add an admin action that nulls candidate PII and writes a tombstone audit entry.

---

## Scripts

```
npm run dev           # next dev
npm run build         # next build
npm run start         # next start (production)
npm run typecheck     # tsc --noEmit
npm run db:generate   # prisma generate
npm run db:push       # prisma db push (no migrations file)
npm run db:migrate    # prisma migrate dev
npm run db:seed       # seed the database
npm run db:studio     # open Prisma Studio
npm run test          # vitest
npm run e2e           # playwright
```

---

## What's intentionally out of scope (and where it would go)

| Concern | Where to add |
|---|---|
| Real OAuth providers (Google / Microsoft) | `src/lib/auth.ts` — add provider entries |
| Background queue worker | Wrap calls in `src/server/actions/*` with a queue (BullMQ, Inngest) |
| SCIM provisioning | `src/app/api/scim/v2/**` |
| Mobile / web push | `Notification` table is already in the schema; wire to a push provider |
| i18n | Add `next-intl`; messages live in `src/messages/` |

---

## License

Internal to ElivixIT.

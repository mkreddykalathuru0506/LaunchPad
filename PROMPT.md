# Launch Pad — Master Build Prompt

> The single source-of-truth prompt used to build this application. Re-using or extending this prompt should produce a functionally equivalent rebuild.

---

## 1. Product Identity

**Name:** Launch Pad
**Owner:** ElivixIT (IT services / consulting / staffing)
**One-liner:** A multi-stage background verification platform for onboarding interns, candidates, and trainers — from invitation to "cleared to start."

**Why it exists:** ElivixIT places people on client engagements. Clients (especially BFSI, healthcare, federal) require verified identity, address, education, employment, criminal, and (where relevant) veteran status before a contractor can be billed. Manual collection (email + spreadsheets + scanned PDFs) is slow, error-prone, audit-hostile, and leaks PII. Launch Pad replaces that with one tracked, audited, role-segmented workflow.

---

## 2. Real-World Industry Reference

Launch Pad's verification model is built to match how the industry actually operates:

| Domain | Real-world references (workflow, fields, doc types) |
|---|---|
| Identity / Document verification | Onfido, Persona, Jumio, IDfy, Signzy |
| Background check (criminal / employment) | Checkr, HireRight, Sterling, AuthBridge, First Advantage |
| Address verification | Physical postcard + digital utility-bill + geo-tagged selfie (AuthBridge / IDfy model) |
| Education verification | Direct registrar/university email + National Student Clearinghouse (US) / UGC (IN) |
| Employment verification | HR letter + payroll proof + The Work Number (US) |
| Criminal | County / state / federal court records (US); Police Clearance Certificate (IN) |
| Veteran status | DD-214 (US) / Discharge book (IN) — voluntary, USERRA-compliant |
| Compliance backbone | FCRA (US), GDPR (EU), DPDP Act (IN), SOC 2 access controls |

Launch Pad **abstracts** these via adapter interfaces (`IdentityVerifier`, `AddressVerifier`, `CriminalVerifier`, etc.) with mock implementations included; swap to real providers by implementing the adapter and supplying credentials.

---

## 3. Personas & Roles (RBAC)

1. **Candidate** — intern, full-time candidate, contractor, or trainer being onboarded. Sees only their own case.
2. **BG Verifier** — operations team member. Reviews assigned cases, requests corrections, marks stages pass/fail.
3. **BG Manager** — supervises verifiers, approves final clearance, can reassign cases, exports reports.
4. **Admin** — full system access, user management, audit log, settings, kill-switch on PII.
5. **System** — automated actor for emails, webhooks, retries, audit entries.

Roles enforced in three layers: NextAuth session → middleware route guard → per-query Prisma filter (defense in depth).

---

## 4. The Nine Verification Stages

Each stage is independently submittable, independently reviewable, and has its own state machine:
`NOT_STARTED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → (NEEDS_CORRECTION ↺) → APPROVED | REJECTED`.

| # | Stage | Candidate provides | Verifier checks |
|---|---|---|---|
| 1 | **Identity** | Govt photo ID (Passport / Driver License / Aadhaar / PAN / SSN), DOB, legal name | Document authenticity, name+DOB match, expiry, MRZ/OCR |
| 2 | **Address** | Current + permanent address, utility bill / lease / bank statement (< 90 days), geo-tagged selfie at residence | Document recency, name match, address consistency |
| 3 | **Education** | Each degree: institution, dates, degree, GPA, scanned transcript + degree certificate, registrar email | Registrar verification email/letter, transcript cross-check |
| 4 | **Employment** | Each prior job: employer, dates, role, manager contact, offer letter, relieving/experience letter, last 3 payslips, Form-16 / W-2 | HR verification (call + email), employment dates, gap analysis |
| 5 | **Criminal** | Consent (FCRA / DPDP), declarations, list of jurisdictions lived in (last 7 years) | County/state/national criminal record search via adapter |
| 6 | **Veteran Status** *(optional, voluntary)* | DD-214 / Discharge book, branch, dates, character of service | Authenticity of discharge document, dates |
| 7 | **Photo Verification** | Live selfie (front camera, liveness prompts) | Face match vs Stage-1 ID photo, liveness signal score |
| 8 | **Video Verification** | Scheduled live video call OR async recorded video reading prompted text | Identity continuity, screen-record artifact, prompt-words read correctly |
| 9 | **Reference Check** | 2–3 professional references (name, relationship, employer, email, phone) | Email + phone outreach, structured questionnaire response |

A case is **CLEARED** only when all required stages reach `APPROVED`. Veteran is required only if the candidate self-identifies as a veteran.

---

## 5. End-to-End Flow

```
Admin/Manager creates Case → Invite email sent to candidate
   ↓
Candidate sets password → completes profile → enters Stage 1
   ↓
Candidate uploads docs + fills forms across stages (saves draft anytime)
   ↓
Candidate submits each stage → enters BG queue
   ↓
BG Verifier picks from queue → reviews → APPROVE / REJECT / NEEDS_CORRECTION
   ↓ (if NEEDS_CORRECTION)
System emails candidate a single-use signed magic link → candidate fixes only that stage → re-submits
   ↓
All required stages APPROVED → BG Manager issues final CLEARED report (PDF) → candidate + hiring manager notified
```

Every transition writes an `AuditEvent`. Every email logs to `EmailLog`. Every document upload logs to `DocumentEvent` with hash, size, MIME, and uploader IP.

---

## 6. Non-Functional Requirements (production-grade)

- **Security**
  - All routes behind NextAuth session except landing, login, magic-link redeemer.
  - Middleware-enforced role guards per route segment.
  - Server actions / API routes validate input with Zod schemas; never trust client.
  - Documents stored outside webroot; served only via signed, short-TTL URLs.
  - At-rest encryption hook (AES-256-GCM) around document blobs; key from env (KMS-ready).
  - PII fields (SSN, Aadhaar, DOB) encrypted at column level via Prisma middleware.
  - CSRF: built into NextAuth; server actions use SameSite=lax cookies.
  - Rate limiting on auth + magic-link redeem (in-memory token bucket, swappable to Redis).
  - Audit log is append-only; UI has no delete affordance.
- **Reliability**
  - All long operations (email send, verification adapter call) are queued with retries.
  - Idempotency keys on candidate submissions to prevent double-submits.
- **Compliance**
  - FCRA-style consent capture stored with timestamp + IP + user-agent.
  - Right-to-erase endpoint (admin-only) that nulls PII and writes tombstone.
  - All emails carry an unsubscribe / "this isn't me" reporting link.
- **Observability**
  - Structured JSON logger (`pino`-style), request-id propagated.
  - Audit log + email log + document log are first-class DB tables, queryable in admin UI.
- **Accessibility**
  - WCAG 2.1 AA: keyboard nav, focus rings, ARIA, color contrast, error association.
- **Performance**
  - Server components by default; client only where interactivity demands it.
  - Streaming UI for review pages, optimistic transitions for candidate forms.

---

## 7. Tech Stack

- **Framework:** Next.js 14 App Router + TypeScript (strict)
- **UI:** Tailwind CSS + shadcn/ui pattern (no runtime dep) + lucide-react icons
- **DB:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth (Credentials + Email magic link)
- **Validation:** Zod end-to-end
- **Email:** Pluggable mailer interface; default = filesystem (`./outbox/*.eml`) + console; production-ready Resend / SMTP adapters
- **Storage:** Pluggable storage interface; default = local `./uploads`; production-ready S3 adapter
- **Verification adapters:** Local mock implementations of identity / address / criminal / education / employment / reference / photo / video; provider classes named after Onfido, Checkr, AuthBridge as drop-in references
- **PDF:** `@react-pdf/renderer` for final cleared report
- **Tests:** Vitest (unit) + Playwright (e2e, scaffolded)

---

## 8. Surface Area (pages)

**Public**
- `/` — marketing landing
- `/login`, `/forgot`, `/redeem/[token]` — auth + magic-link redeemer

**Candidate**
- `/me` — dashboard with stage timeline + progress bar
- `/me/profile` — bio
- `/me/stage/[stage]` — per-stage form (1..9)
- `/me/documents` — all uploaded docs (read-only)

**Verifier**
- `/work` — queue (filter by stage, age, assigned)
- `/work/case/[id]` — full case file with all stages, decision controls
- `/work/case/[id]/stage/[stage]` — focused review of one stage

**Manager**
- `/team` — verifier load and SLA dashboard
- `/team/reports` — exportable reports
- `/team/case/[id]/clear` — final clearance action + PDF generation

**Admin**
- `/admin` — overview
- `/admin/users` — user / role management
- `/admin/audit` — audit log search
- `/admin/email-log` — email log search
- `/admin/settings` — branding, SLAs, required stages

---

## 9. Data Model (high level — see `prisma/schema.prisma` for full)

`User, Account, Session` — NextAuth
`Candidate` — extends User
`Case` — one per onboarding; owned by candidate; assigned to verifier
`Stage` — one per (Case, StageType); state machine
`Document` — files, hashed, encrypted at rest
`Address, Education, Employment, Reference, VeteranRecord` — structured stage payloads
`ConsentRecord` — FCRA/DPDP consents with timestamp/IP/UA
`AuditEvent` — append-only
`EmailLog`, `Notification`, `MagicLink`
`Settings` — singleton, branding + required stages

---

## 10. Build Order (this build follows it)

1. Repo skeleton + tooling
2. Prisma schema + seed
3. Auth (NextAuth + middleware + RBAC helpers)
4. Core libs: db, env, logger, mailer, storage, crypto, rate-limit, verifier adapters
5. UI primitives (Button, Input, Card, Badge, etc.)
6. Public pages (landing, login, redeem)
7. Candidate portal (dashboard + all 9 stage forms)
8. Verifier portal (queue + case review)
9. Manager + Admin
10. Email templates + magic-link resubmission
11. PDF report
12. Seed data + README + Docker

---

## 11. Definition of Done

- `pnpm install && pnpm db:push && pnpm db:seed && pnpm dev` produces a working app.
- Seed creates: 1 admin, 1 manager, 2 verifiers, 6 candidates spread across all stage states (including a NEEDS_CORRECTION case to exercise the magic-link path).
- Every page renders without runtime errors and is keyboard-navigable.
- All forms validate server-side via Zod.
- A candidate can complete all 9 stages; a verifier can request a correction; the candidate can fix and resubmit via emailed link; a manager can issue a CLEARED PDF.
- The audit log shows every transition.
- The README explains how to swap mocks for real providers.

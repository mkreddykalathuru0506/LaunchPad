import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Stamp } from "@/components/v2/stamp";
import { WorkflowPipeline } from "@/components/landing/workflow-pipeline";
import {
  ShieldCheck, Fingerprint, GraduationCap, Briefcase, FileSearch,
  Camera, Video, MapPin, Medal, ArrowRight, CheckCircle2, Lock,
} from "lucide-react";

// ─── Clearance-dossier landing ───────────────────────────────────────────────
// Fixed navy hero + CTA band (identical both themes), MRZ strips, stamp marks,
// animated verification pipeline, connected lifecycle rail. Sky accent only.

// Hero dossier ledger — the eight stages, mid-verification.
const ledger = [
  { icon: Fingerprint, label: "IDENTITY", status: "APPROVED", cls: "text-emerald-400" },
  { icon: MapPin, label: "ADDRESS", status: "APPROVED", cls: "text-emerald-400" },
  { icon: GraduationCap, label: "EDUCATION", status: "APPROVED", cls: "text-emerald-400" },
  { icon: Briefcase, label: "EMPLOYMENT", status: "IN REVIEW", cls: "text-sky-400" },
  { icon: FileSearch, label: "CRIMINAL", status: "PENDING", cls: "text-slate-500" },
  { icon: Camera, label: "PHOTO", status: "PENDING", cls: "text-slate-500" },
  { icon: Video, label: "VIDEO", status: "PENDING", cls: "text-slate-500" },
  { icon: Medal, label: "VETERAN", status: "OPTIONAL", cls: "text-slate-500" },
];

const lifecycle = [
  { step: "01", title: "Invite", text: "Manager opens the case; candidate receives a secure invite." },
  { step: "02", title: "Submit", text: "Candidate completes stages with documents and consent." },
  { step: "03", title: "Review", text: "Verifier approves, rejects, or requests corrections." },
  { step: "04", title: "Clear", text: "Signed PDF clearance report when every stage is approved." },
];

const MRZ = "LP<2026<ELVIXIT<BGV<<IDENTITY<ADDRESS<EDUCATION<EMPLOYMENT<CRIMINAL<PHOTO<VIDEO<<CLEARED<<<<";

function MrzStrip({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`mrz text-[11px] leading-relaxed opacity-40 ${className}`}>
      {MRZ}
      <br />
      {"<<<TRACKED<AUDITED<ENCRYPTED<<FCRA<DPDP<COMPLIANT<<<SOC2<SHAPED<ACCESS<CONTROLS<<<<<<<<<<<<<<"}
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav aria-label="Landing" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#stages" className="transition-colors hover:text-foreground">Workflow</a>
            <a href="#lifecycle" className="transition-colors hover:text-foreground">Lifecycle</a>
            <a href="#security" className="transition-colors hover:text-foreground">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
            <Button variant="brand" asChild><Link href="/login">Open your case <ArrowRight className="h-4 w-4" aria-hidden /></Link></Button>
          </div>
        </div>
      </header>

      {/* ── Hero — fixed navy, both themes ──────────────────────────────── */}
      <section className="panel-navy relative overflow-hidden">
        <div aria-hidden className="dot-grid-light absolute inset-0 opacity-60 [mask-image:radial-gradient(80%_70%_at_50%_20%,#000_30%,transparent_75%)]" />
        <div className="container relative grid items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          {/* Copy */}
          <div className="animate-fade-in-up">
            <div className="font-mono text-xs font-medium tracking-[0.18em] text-sky-300/90">
              {"// ElvixIT internal · BGV platform"}
            </div>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Trust,{" "}
              <span className="bg-gradient-to-r from-sky-300 via-sky-400 to-sky-300 bg-clip-text text-transparent">
                verified
              </span>
              <br />
              before day one.
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-slate-300">
              Eight verification stages — identity to video — collected, reviewed, and
              stamped in one tracked, audited case file.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="brand" asChild>
                <Link href="/login">Open your case <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
                <a href="#stages">See the workflow</a>
              </Button>
            </div>

            {/* Mono stat chips */}
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 font-mono">
              {[
                ["08", "stages"],
                ["72h", "stage SLA"],
                ["100%", "audited"],
              ].map(([v, l]) => (
                <div key={l} className="bg-slate-900/80 px-4 py-3">
                  <dt className="order-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">{l}</dt>
                  <dd className="tabnum text-xl font-bold text-sky-300">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Dossier mock — the eight stages, mid-verification */}
          <div className="relative animate-fade-in-up [animation-delay:120ms]" aria-hidden>
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-sky-400/10 blur-3xl" />
            <div className="relative mx-auto max-w-md rotate-1 rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl shadow-black/50 backdrop-blur transition-transform duration-300 hover:rotate-0">
              {/* File header */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">Case file</div>
                <div className="font-mono text-xs font-bold tracking-widest text-sky-300">LP-2026-0042</div>
              </div>
              {/* Ledger header */}
              <div className="flex items-center justify-between px-5 pb-1 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Verification ledger · 8 stages
                </div>
                <Stamp tone="brand" tilt className="shrink-0 bg-slate-950/40">In review</Stamp>
              </div>
              {/* Stage ledger */}
              <ul className="space-y-1.5 px-5 pb-4 pt-2 font-mono text-[11px]">
                {ledger.map(({ icon: Icon, label, status, cls }) => (
                  <li key={label} className="flex items-center gap-2.5 text-slate-400">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-sky-300/80 ring-1 ring-inset ring-white/10">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{label}</span>
                    <span className="flex-1 border-b border-dotted border-white/15" />
                    <span className={`font-semibold tracking-widest ${cls}`}>{status}</span>
                  </li>
                ))}
              </ul>
              {/* MRZ */}
              <div className="border-t border-dashed border-white/15 px-5 py-3">
                <div className="mrz text-[10px] text-slate-500">
                  {"LP<2026<0042<<8<STAGES<<3<APPROVED<<IN<REVIEW<<<"}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Hero MRZ footer */}
        <div className="relative border-t border-white/10">
          <div className="container py-3 text-slate-500">
            <MrzStrip />
          </div>
        </div>
      </section>

      {/* ── Stages — bento ──────────────────────────────────────────────── */}
      <section id="stages" className="spotlight-top relative scroll-mt-16 border-b">
        <div className="container py-24">
          <div className="max-w-2xl">
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand">{"// Workflow"}</div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Eight stages. One case file.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every stage runs its own state machine — submitted, under review, approved —
              with a one-click correction loop that emails a single-use resubmission link.
            </p>
          </div>

          <WorkflowPipeline />
        </div>
      </section>

      {/* ── Lifecycle — connected rail ──────────────────────────────────── */}
      <section id="lifecycle" className="scroll-mt-16 border-b bg-muted/30">
        <div className="container py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand">{"// Lifecycle"}</div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">How a case moves</h2>
            <p className="mt-4 text-lg text-muted-foreground">From invite to cleared report, every event is recorded.</p>
          </div>
          <ol className="relative mx-auto mt-16 grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {/* connecting line */}
            <div aria-hidden className="hairline-sky absolute left-[10%] right-[10%] top-7 hidden lg:block" />
            {lifecycle.map((s) => (
              <li key={s.step} className="relative text-center lg:px-3">
                <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/30 bg-background font-mono text-sm font-bold text-brand shadow-sm">
                  {s.step}
                </div>
                <div className="mt-4 font-display text-lg font-semibold">{s.title}</div>
                <p className="mx-auto mt-1.5 max-w-[16rem] text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <section id="security" className="scroll-mt-16 border-b">
        <div className="container grid items-center gap-14 py-24 lg:grid-cols-2">
          <div>
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand">{"// Security"}</div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">Built for sensitive data</h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Your identity documents, ID numbers, and date of birth are handled like the
              sensitive records they are — encrypted, access-controlled, and tracked from
              the moment you upload them to the day you're cleared.
            </p>
            <ul className="mt-7 space-y-3.5 text-sm">
              {[
                "ID numbers and date of birth are encrypted at rest",
                "Only your assigned verification team can open your file",
                "Every view, decision, and download is recorded in the audit trail",
                "Document links are private, signed, and expire automatically",
                "Your written consent is captured before any check is run",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Protection ledger — what the platform does with YOUR data */}
          <div className="relative" aria-hidden>
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-brand/20 via-brand/5 to-transparent blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400">
                  <Lock className="h-3 w-3 text-sky-400" /> Data protection
                </span>
                <span className="font-mono text-[10px] font-bold tracking-widest text-emerald-400">AES-256 · AT REST</span>
              </div>

              {/* Encrypted fields, shown the way the team sees them */}
              <ul className="space-y-2.5 px-5 py-4 font-mono text-[11px]">
                {[
                  ["AADHAAR NUMBER", "•••• •••• 4821"],
                  ["DATE OF BIRTH", "••/••/••••"],
                  ["PAN NUMBER", "•••••184F"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2 text-slate-400">
                    <span>{k}</span>
                    <span className="flex-1 border-b border-dotted border-white/15" />
                    <span className="tracking-widest text-slate-300">{v}</span>
                    <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400">
                      ENCRYPTED
                    </span>
                  </li>
                ))}
              </ul>

              {/* Human-readable audit trail */}
              <div className="border-t border-dashed border-white/15 px-5 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Audit trail · live</div>
                <ul className="mt-3 space-y-2.5 text-xs text-slate-300">
                  {[
                    ["14:02", "Identity stage approved by your verifier"],
                    ["14:31", "Address proof viewed — BG team only"],
                    ["15:10", "Clearance report issued & emailed to you"],
                  ].map(([t, msg]) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="tabnum font-mono text-[10px] text-sky-400">{t}</span>
                      <span className="flex-1">{msg}</span>
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band — fixed navy ───────────────────────────────────────── */}
      <section className="panel-navy relative overflow-hidden">
        <div aria-hidden className="dot-grid-light absolute inset-0 opacity-50 [mask-image:radial-gradient(60%_100%_at_50%_50%,#000,transparent)]" />
        <div className="container relative flex flex-col items-center gap-7 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-sky-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Restricted internal system
          </span>
          <h2 className="max-w-2xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to clear your next hire?
          </h2>
          <Button size="lg" variant="brand" asChild>
            <Link href="/login">Open the portal <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </Button>
          <div className="w-full max-w-3xl text-slate-500">
            <MrzStrip className="text-center" />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer>
        <div className="container flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
          <Logo />
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} ElvixIT · Launch Pad · Internal verification platform
          </div>
        </div>
      </footer>
    </div>
  );
}

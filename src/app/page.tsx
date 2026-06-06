import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Stamp } from "@/components/v2/stamp";
import {
  ShieldCheck, Fingerprint, GraduationCap, Briefcase, FileSearch,
  Camera, Video, MapPin, Medal, ArrowRight, CheckCircle2, Lock, ScanLine,
} from "lucide-react";

// ─── Clearance-dossier landing ───────────────────────────────────────────────
// Fixed navy hero + CTA band (identical both themes), MRZ strips, stamp marks,
// bento stage grid, connected lifecycle rail. Single sky accent throughout.

const stages = [
  { icon: Fingerprint, title: "Identity", blurb: "Government ID + biometric match.", big: true },
  { icon: MapPin, title: "Address", blurb: "Current + permanent with proof." },
  { icon: GraduationCap, title: "Education", blurb: "SSC, Intermediate, Degree verification." },
  { icon: Briefcase, title: "Employment", blurb: "HR-confirmed work history." },
  { icon: FileSearch, title: "Criminal", blurb: "Multi-jurisdiction record search." },
  { icon: Camera, title: "Photo", blurb: "Liveness + face match." },
  { icon: Video, title: "Video", blurb: "Recorded prompt-phrase capture." },
  { icon: Medal, title: "Veteran Status", blurb: "Optional, USERRA-compliant." },
];

const lifecycle = [
  { step: "01", title: "Invite", text: "Manager opens the case; candidate receives a secure invite." },
  { step: "02", title: "Submit", text: "Candidate completes stages with documents and consent." },
  { step: "03", title: "Review", text: "Verifier approves, rejects, or requests corrections." },
  { step: "04", title: "Clear", text: "Signed PDF clearance report when every stage is approved." },
];

const MRZ = "LP<2026<ELIVIXIT<BGV<<IDENTITY<ADDRESS<EDUCATION<EMPLOYMENT<CRIMINAL<PHOTO<VIDEO<<CLEARED<<<<";

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
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-sky-300/90">
              {"// Elivixit internal · BGV platform"}
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

          {/* Dossier mock */}
          <div className="relative animate-fade-in-up [animation-delay:120ms]" aria-hidden>
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-sky-400/10 blur-3xl" />
            <div className="relative mx-auto max-w-md rotate-1 rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl shadow-black/50 backdrop-blur transition-transform duration-300 hover:rotate-0">
              {/* File header */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">Case file</div>
                <div className="font-mono text-xs font-bold tracking-widest text-sky-300">LP-2026-0042</div>
              </div>
              {/* Subject */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/15 bg-slate-800 font-display text-lg font-bold text-sky-300">
                  AR
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-semibold text-white">Aanya Raghavan</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Backend Engineer · Candidate</div>
                </div>
                <Stamp tone="success" tilt className="ml-auto shrink-0 bg-slate-950/40">Cleared</Stamp>
              </div>
              {/* Stage ledger */}
              <ul className="space-y-1 px-5 pb-4 font-mono text-[11px]">
                {[
                  ["IDENTITY", "APPROVED", "text-emerald-400"],
                  ["ADDRESS", "APPROVED", "text-emerald-400"],
                  ["EDUCATION", "APPROVED", "text-emerald-400"],
                  ["EMPLOYMENT", "APPROVED", "text-emerald-400"],
                  ["CRIMINAL", "APPROVED", "text-emerald-400"],
                  ["PHOTO", "APPROVED", "text-emerald-400"],
                  ["VIDEO", "APPROVED", "text-emerald-400"],
                ].map(([k, v, cls]) => (
                  <li key={k} className="flex items-baseline gap-2 text-slate-400">
                    <span>{k}</span>
                    <span className="flex-1 border-b border-dotted border-white/15" />
                    <span className={`font-semibold tracking-widest ${cls}`}>{v}</span>
                  </li>
                ))}
              </ul>
              {/* MRZ */}
              <div className="border-t border-dashed border-white/15 px-5 py-3">
                <div className="mrz text-[10px] text-slate-500">
                  {"LP<2026<0042<<RAGHAVAN<<AANYA<<<CLEARED<<<"}
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

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map(({ icon: Icon, title, blurb, big }) => (
              <div
                key={title}
                className={`group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 ${
                  big ? "sm:col-span-2 sm:row-span-2 sm:p-8" : ""
                }`}
              >
                <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand/60 via-brand/15 to-transparent" />
                {big && (
                  <div aria-hidden className="dot-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_80%_20%,#000,transparent)]" />
                )}
                <div className={`relative flex items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/20 transition-colors group-hover:bg-brand group-hover:text-brand-foreground ${big ? "h-14 w-14" : "h-10 w-10"}`}>
                  <Icon className={big ? "h-7 w-7" : "h-5 w-5"} aria-hidden />
                </div>
                <div className={`relative mt-5 font-display font-semibold ${big ? "text-2xl" : "text-base"}`}>{title}</div>
                <p className={`relative mt-1.5 text-muted-foreground ${big ? "max-w-sm text-base" : "text-sm"}`}>{blurb}</p>
                {big && (
                  <div className="relative mt-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    <ScanLine className="h-3.5 w-3.5 text-brand" aria-hidden />
                    Biometric face-match against ID photo
                  </div>
                )}
              </div>
            ))}
          </div>
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
              FCRA consent capture, append-only audit log, column-level encryption for
              SSN / Aadhaar / DOB, signed short-TTL document URLs, and hard role
              separation between candidates, verifiers, managers, and admins.
            </p>
            <ul className="mt-7 space-y-3.5 text-sm">
              {[
                "Role-based access at middleware, page, and query layers",
                "AES-256-GCM at rest for sensitive identity fields",
                "Append-only audit log for every state transition",
                "Signed, expiring URLs for all document downloads",
                "Pluggable adapters for Onfido, Persona, Checkr, AuthBridge",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Terminal card */}
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-brand/20 via-brand/5 to-transparent blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  <Lock className="h-3 w-3" aria-hidden /> decide-stage · trace
                </span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-slate-400">
{`POST /api/stages/:id/decide
  ↳ middleware  requireSession + role guard      `}<span className="text-emerald-400">ok</span>{`
  ↳ validate    zod body                          `}<span className="text-emerald-400">ok</span>{`
  ↳ tx          update Stage → StageReview        `}<span className="text-emerald-400">ok</span>{`
  ↳ audit       append-only event written         `}<span className="text-emerald-400">ok</span>{`
  ↳ notify      candidate emailed on decision     `}<span className="text-sky-400">sent</span>
              </pre>
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
            © {new Date().getFullYear()} ElivixIT · Launch Pad · Internal verification platform
          </div>
        </div>
      </footer>
    </div>
  );
}

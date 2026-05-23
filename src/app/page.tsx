import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import {
  ShieldCheck, Fingerprint, GraduationCap, Briefcase, FileSearch,
  Camera, Video, Users, MapPin, Medal, ArrowRight, CheckCircle2, Lock, Sparkles,
} from "lucide-react";

const stages = [
  { icon: Fingerprint, title: "Identity", blurb: "Government ID + biometric match.", tint: "from-indigo-500 to-violet-500" },
  { icon: MapPin, title: "Address", blurb: "Current + permanent with proof.", tint: "from-emerald-500 to-teal-500" },
  { icon: GraduationCap, title: "Education", blurb: "SSC, Intermediate, Degree verification.", tint: "from-amber-500 to-orange-500" },
  { icon: Briefcase, title: "Employment", blurb: "HR-confirmed work history.", tint: "from-rose-500 to-pink-500" },
  { icon: FileSearch, title: "Criminal", blurb: "Multi-jurisdiction record search.", tint: "from-red-500 to-rose-500" },
  { icon: Medal, title: "Veteran Status", blurb: "Optional, USERRA-compliant.", tint: "from-sky-500 to-blue-500" },
  { icon: Camera, title: "Photo", blurb: "Liveness + face match.", tint: "from-fuchsia-500 to-purple-500" },
  { icon: Video, title: "Video", blurb: "Recorded prompt-phrase capture.", tint: "from-cyan-500 to-sky-500" },
  { icon: Users, title: "Reference", blurb: "Structured professional references.", tint: "from-lime-500 to-emerald-500" },
];

const stats = [
  { value: "9", label: "Verification stages" },
  { value: "72h", label: "Per-stage SLA" },
  { value: "FCRA · DPDP", label: "Compliance-aware" },
  { value: "SOC 2", label: "Audit log built-in" },
];

export default function Home() {
  return (
    <div className="relative">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
            <Button asChild><Link href="/login">Candidate portal <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 gradient-hero" />
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            ElivixIT internal · Background verification platform
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Onboard with{" "}
            <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
              verified trust
            </span>
            <br />
            from invite to day one.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Launch Pad runs nine verification stages — identity, address, education, employment, criminal,
            veteran, photo, video, and reference — in one tracked, audited workflow.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/login">Open your case <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#stages">See how it works</Link>
            </Button>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card/80 p-4 backdrop-blur">
                <div className="tabnum text-2xl font-semibold tracking-tight">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stages */}
      <section id="stages" className="relative border-b">
        <div className="absolute inset-0 -z-10 grid-pattern opacity-30" />
        <div className="container py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="inline-block h-1 w-1 rounded-full bg-primary" />
              Workflow
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Nine stages, one source of truth</h2>
            <p className="mt-3 text-muted-foreground">
              Each stage has its own state machine: submitted → under review → approved, with a one-click
              "needs correction" loop that emails the candidate a single-use resubmission link.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stages.map(({ icon: Icon, title, blurb, tint }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-2xl border bg-card/80 p-6 backdrop-blur transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-lg"
              >
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tint} opacity-60`} />
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-white shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base font-semibold">{title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b bg-muted/30">
        <div className="container py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="inline-block h-1 w-1 rounded-full bg-primary" />
              Lifecycle
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How a case moves</h2>
            <p className="mt-3 text-muted-foreground">From invite to cleared report, every event is recorded.</p>
          </div>
          <ol className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Invite", text: "Manager creates the case; candidate receives a secure invite email." },
              { step: "02", title: "Submit", text: "Candidate completes stages with documents, signatures, and consent." },
              { step: "03", title: "Review", text: "BG verifier inspects each stage and approves, rejects, or requests fixes." },
              { step: "04", title: "Clear", text: "Manager issues a signed PDF clearance report when all stages are approved." },
            ].map((s, i) => (
              <li key={s.step} className="relative rounded-2xl border bg-card p-6">
                <div className="tabnum text-[11px] font-mono font-semibold tracking-wider text-primary">{s.step}</div>
                <div className="mt-2 text-base font-semibold">{s.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Security */}
      <section className="border-b">
        <div className="container grid items-center gap-12 py-24 lg:grid-cols-2">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="inline-block h-1 w-1 rounded-full bg-primary" />
              Security
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for sensitive data</h2>
            <p className="mt-4 text-muted-foreground">
              Launch Pad is designed around the realities of PII handling — FCRA consent capture, append-only
              audit log, column-level encryption for SSN / Aadhaar / DOB, signed short-TTL URLs for document
              access, and role separation between candidates, verifiers, managers, and admins.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Role-based access at middleware, page, and query layers",
                "AES-256-GCM at rest for sensitive identity fields",
                "Append-only audit log for every state transition",
                "Signed, expiring URLs for all document downloads",
                "Pluggable adapters for Onfido, Persona, Checkr, AuthBridge",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-fuchsia-500/15 to-cyan-500/15 blur-2xl" />
            <div className="rounded-2xl border bg-card p-8 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold">SOC 2-shaped access controls</div>
                  <div className="text-xs text-muted-foreground">Defense in depth, by default.</div>
                </div>
              </div>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-muted/60 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
{`POST /api/stages/:id/decide
  ↳ middleware: requireSession + role guard
  ↳ route:      Zod validate body
  ↳ db:         tx { update Stage, write
                StageReview, audit, notify }
  ↳ mailer:     candidate notified on decision`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
          <Logo />
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ElivixIT · Launch Pad. Internal verification platform.
          </div>
        </div>
      </footer>
    </div>
  );
}

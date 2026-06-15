import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getCaseForVerifier } from "@/server/queries/case";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CaseStatusBadge, StageStatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  stageLabels,
  formatDate,
  formatDateTime,
  physicalVerificationStatusLabels,
  physicalStatusTone,
} from "@/lib/utils";
import { computeCaseStatus } from "@/lib/stages";
import { getPhysicalSummaryForCase } from "@/server/queries/physical";
import { StageReviewForm } from "./stage-review-form";
import { ManagerActions } from "./manager-actions";
import { StartPhysicalPanel } from "./physical/start-panel";
import { ArrowLeft, FileDown, FileText, MapPin, MapPinned, GraduationCap, Briefcase, Users, Medal, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { maskTail } from "@/lib/crypto";

/** Small "this field is sealed" chip for masked PII rows. */
function EncryptedChip() {
  return (
    <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-success">
      ENCRYPTED
    </span>
  );
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  // Lightweight lookup — only the reference is needed for the tab title.
  const kase = await db.case.findUnique({
    where: { id: params.id },
    select: { reference: true },
  });
  return { title: kase ? `Case ${kase.reference}` : "Case file" };
}

export default async function CaseDetail({ params }: { params: { id: string } }) {
  const session = await requireRole(["VERIFIER", "MANAGER", "ADMIN"]);
  const kase = await getCaseForVerifier(params.id);
  if (!kase) notFound();

  const verifiers = session.user.role === "MANAGER" || session.user.role === "ADMIN"
    ? await db.user.findMany({ where: { role: "VERIFIER", active: true }, orderBy: { name: "asc" } })
    : [];

  // Zero-knowledge for staff: DOB and ID numbers are NEVER decrypted for
  // display — not for verifiers, managers, or admins. Verification happens
  // against the uploaded document image; the UI shows masked tails only.
  const idPayload = (kase.stages.find((s) => s.type === "IDENTITY")?.payload ?? {}) as {
    documentType?: string;
    documentNumberLast4?: string;
    documentNumber?: string; // legacy plaintext rows — masked, never rendered in full
  };
  const idNumberMasked = idPayload.documentNumberLast4
    ? `••••${idPayload.documentNumberLast4}`
    : idPayload.documentNumber
      ? maskTail(idPayload.documentNumber)
      : null;
  const audits = await db.auditEvent.findMany({
    where: { caseId: kase.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: true },
  });
  const physical = await getPhysicalSummaryForCase(kase.id);

  return (
    <>
      <Link href="/work" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to queue
      </Link>

      <PageHeader
        title={`${kase.reference} · ${kase.candidate.user.name ?? kase.candidate.user.email}`}
        description={`${kase.candidate.candidateType} · ${kase.candidate.positionTitle ?? "Onboarding"}`}
        actions={
          <>
            <CaseStatusBadge status={kase.status} />
            {kase.clearedReportPath && (
              <Button asChild variant="outline" size="sm">
                <a href={`/api/documents/${encodeURIComponent(kase.clearedReportPath)}`} target="_blank" rel="noreferrer">
                  <FileDown aria-hidden="true" className="h-4 w-4" /> Clearance PDF
                </a>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* min-w-0 lets this column shrink instead of overflowing under the aside. */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Tabs defaultValue="stages">
            <TabsList>
              <TabsTrigger value="stages">Stages</TabsTrigger>
              <TabsTrigger value="data">Candidate data</TabsTrigger>
              <TabsTrigger value="docs">Documents</TabsTrigger>
              <TabsTrigger value="field">Field</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="stages" className="space-y-4">
              {kase.stages.map((s) => (
                <Card key={s.id} className={s.status === "SUBMITTED" || s.status === "UNDER_REVIEW" ? "border-brand/50" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{stageLabels[s.type]}</CardTitle>
                        <CardDescription>
                          {s.submittedAt ? `Submitted ${formatDateTime(s.submittedAt)}` : "Not submitted yet"}
                        </CardDescription>
                      </div>
                      <StageStatusBadge status={s.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <StageEvidence type={s.type} kase={kase} />
                    {(s.status === "SUBMITTED" || s.status === "UNDER_REVIEW" || s.status === "NEEDS_CORRECTION") && (
                      <StageReviewForm stageId={s.id} stageType={s.type} />
                    )}
                    {s.reviews.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review history</div>
                        <ul className="space-y-2 text-sm">
                          {s.reviews.map((r) => (
                            <li key={r.id} className="rounded-md border bg-muted/30 p-2">
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{r.reviewer?.name ?? "Reviewer"}</span>
                                <span>{formatDateTime(r.createdAt)}</span>
                              </div>
                              <div className="mt-1"><StageStatusBadge status={r.decision} /></div>
                              {r.comment && <p className="mt-2">{r.comment}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                  <Field k="Legal name" v={`${kase.candidate.legalFirstName ?? ""} ${kase.candidate.legalMiddleName ?? ""} ${kase.candidate.legalLastName ?? ""}`.trim() || "—"} />
                  <Field
                    k="Date of birth"
                    v={
                      <span className="inline-flex items-center gap-2">
                        <span className="font-mono tracking-wider">••-••-••••</span>
                        <EncryptedChip />
                      </span>
                    }
                  />
                  <Field
                    k="ID document"
                    v={
                      idPayload.documentType ? (
                        <span className="inline-flex items-center gap-2">
                          <span>
                            {idPayload.documentType} ·{" "}
                            <span className="font-mono tracking-wider">{idNumberMasked ?? "—"}</span>
                          </span>
                          <EncryptedChip />
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field k="Nationality" v={kase.candidate.nationality ?? "—"} />
                  <Field k="Phone" v={kase.candidate.phone ?? "—"} />
                </CardContent>
              </Card>

              {kase.addresses.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0"><MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><CardTitle className="text-base">Addresses</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {kase.addresses.map((a) => (
                      <div key={a.id} className="rounded-md border p-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{a.type}</div>
                        <div className="mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</div>
                        <div className="text-muted-foreground">{a.city}, {a.state} {a.postalCode}, {a.country}</div>
                        {a.fromDate && <div className="mt-1 text-xs text-muted-foreground">Since {formatDate(a.fromDate)}</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {kase.educations.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0"><GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><CardTitle className="text-base">Education</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {kase.educations.map((e) => (
                      <div key={e.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{e.degree} · {e.institution}</div>
                          <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{e.level}</span>
                        </div>
                        {e.board && <div className="text-xs text-muted-foreground">{e.board}{e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}</div>}
                        <div className="text-muted-foreground">{formatDate(e.startDate)} → {formatDate(e.endDate)} {e.gpa && `· ${e.gpa}`}</div>
                        {e.rollNumber && <div className="text-xs text-muted-foreground">Roll / Reg #: {e.rollNumber}</div>}
                        {e.registrarEmail && <div className="text-xs text-muted-foreground">Registrar: {e.registrarEmail}</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {kase.employments.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0"><Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><CardTitle className="text-base">Employment</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {kase.employments.map((e) => (
                      <div key={e.id} className="rounded-md border p-3">
                        <div className="font-medium">{e.title} · {e.employer}</div>
                        <div className="text-muted-foreground">{formatDate(e.startDate)} → {e.isCurrent ? "present" : formatDate(e.endDate)}</div>
                        {e.managerEmail && <div className="text-xs text-muted-foreground">Manager: {e.managerName ?? "—"} · {e.managerEmail}</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {kase.references.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0"><Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><CardTitle className="text-base">References</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {kase.references.map((r) => (
                      <div key={r.id} className="rounded-md border p-3">
                        <div className="font-medium">{r.name} · {r.relationship}</div>
                        <div className="text-muted-foreground">{r.email} {r.phone ? `· ${r.phone}` : ""}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {kase.veteranRecord && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0"><Medal className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><CardTitle className="text-base">Veteran</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    {kase.veteranRecord.branch} · {formatDate(kase.veteranRecord.serviceStart)} → {formatDate(kase.veteranRecord.serviceEnd)}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="docs">
              <Card><CardContent className="p-0">
                {/* Two columns only — the old 6-column table (filename, size,
                    SHA-256, …) overflowed under the right-hand panels, hiding
                    details and burying the Open button. The KIND itself is the
                    link: click it to open the file in a new tab. */}
                <div className="flex items-center justify-between border-b border-dashed px-4 py-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Document ledger
                  </span>
                  <span className="rounded-md bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-brand">
                    {String(kase.documents.length).padStart(2, "0")}
                  </span>
                </div>
                {kase.documents.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No documents uploaded yet.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="p-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Kind</th>
                        <th className="p-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kase.documents.map((d) => (
                        <tr key={d.id} className="border-t transition-colors hover:bg-accent/50">
                          <td className="p-3">
                            <a
                              href={`/api/documents/${encodeURIComponent(d.storagePath)}`}
                              target="_blank"
                              rel="noreferrer"
                              title={d.filename}
                              aria-label={`Open ${d.filename}`}
                              className="focus-ring inline-flex items-center gap-2 rounded-md font-medium text-brand hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span className="capitalize">{d.kind.replace(/_/g, " ").toLowerCase()}</span>
                            </a>
                          </td>
                          <td className="p-3 font-mono text-xs tracking-wide text-muted-foreground">{formatDateTime(d.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="field" className="space-y-4">
              {!physical ? (
                <StartPhysicalPanel caseId={kase.id} />
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                          <MapPinned className="h-5 w-5" />
                        </span>
                        <div>
                          <CardTitle className="text-base">Physical (field) verification</CardTitle>
                          <CardDescription>Optional, background on-ground checks.</CardDescription>
                        </div>
                      </div>
                      <Badge tone={physicalStatusTone(physical.status)}>
                        {physicalVerificationStatusLabels[physical.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <MapPinned className="h-4 w-4 text-brand" aria-hidden /> {physical.total} site(s)
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> {physical.verified} verified
                      </span>
                    </div>
                    <Button asChild variant="brand" size="sm">
                      <Link href={`/work/case/${kase.id}/physical`}>
                        <MapPinned className="h-4 w-4" /> Open field workspace
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="audit">
              <Card><CardContent>
                <ul className="space-y-3 text-sm">
                  {audits.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                      <div className="flex-1">
                        <div className="font-medium">{a.action} {a.target && <span className="text-muted-foreground">· {a.target}</span>}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.actor?.name ?? "system"} · {formatDateTime(a.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Case</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Field k="Reference" v={kase.reference} />
              <Field k="Company" v={kase.companyName ?? "—"} />
              {kase.appName && <Field k="App" v={kase.appName} />}
              <Field
                k="Result delivery"
                v={
                  kase.portalCandidateKind
                    ? "Portal (automatic)"
                    : kase.resultEmail
                      ? `Email · ${kase.resultEmail}`
                      : "Internal only"
                }
              />
              <Field k="Type" v={kase.candidate.candidateType} />
              <Field k="Position" v={kase.candidate.positionTitle ?? "—"} />
              <Field k="Start date" v={formatDate(kase.candidate.startDate)} />
              <Field k="Verifier" v={kase.assignedVerifier?.name ?? "Unassigned"} />
              <Field k="Manager" v={kase.managedBy?.name ?? "—"} />
              <Field k="Created" v={formatDateTime(kase.createdAt)} />
            </CardContent>
          </Card>

          {(session.user.role === "MANAGER" || session.user.role === "ADMIN") && (
            <ManagerActions
              caseId={kase.id}
              verifiers={verifiers.map((v) => ({ id: v.id, name: v.name ?? v.email }))}
              currentVerifierId={kase.assignedVerifierId}
              canClear={computeCaseStatus(kase, kase.stages) === "CLEARED"}
              alreadyCleared={kase.status === "CLEARED"}
            />
          )}
        </aside>
      </div>
    </>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-right">{v}</div>
    </div>
  );
}

function StageEvidence({ type, kase }: { type: any; kase: any }) {
  if (type === "ADDRESS" && kase.addresses?.length) {
    return <div className="text-xs text-muted-foreground">{kase.addresses.length} address record(s) on file</div>;
  }
  if (type === "EDUCATION" && kase.educations?.length) {
    return <div className="text-xs text-muted-foreground">{kase.educations.length} education record(s) on file</div>;
  }
  if (type === "EMPLOYMENT" && kase.employments?.length) {
    return <div className="text-xs text-muted-foreground">{kase.employments.length} employment record(s) on file</div>;
  }
  if (type === "REFERENCE" && kase.references?.length) {
    return <div className="text-xs text-muted-foreground">{kase.references.length} reference(s) provided</div>;
  }
  return null;
}

// Centralized email side-effects. Every action that wants to notify someone
// should call one of these — keeps templates, audit, and DB writes consistent.

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { sendMail } from "@/lib/mailer";
import { tpl } from "@/lib/email-templates";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { stageLabels } from "@/lib/utils";
import { StageType } from "@prisma/client";

async function safeSend(mail: Parameters<typeof sendMail>[0]) {
  try {
    await sendMail(mail);
  } catch (e) {
    logger.error("email.send_failed", { to: mail.to, subject: mail.subject, error: String(e) });
  }
}

// ────────────────────────── Candidate lifecycle ─────────────────────────────

export async function emailCandidateInvited(opts: {
  to: string; name: string; reference: string; tempPassword: string; caseId: string;
}) {
  await safeSend({
    to: opts.to,
    subject: `[Launch Pad] You're invited — case ${opts.reference}`,
    html: tpl.invite(opts.name, opts.reference, opts.tempPassword),
    templateId: "case.invited",
    caseId: opts.caseId,
  });
}

export async function emailCandidateAssigned(opts: {
  to: string; name: string; reference: string; verifierName: string; caseId: string;
}) {
  await safeSend({
    to: opts.to,
    subject: `[Launch Pad] ${opts.verifierName} is reviewing your case`,
    html: tpl.caseAssignedToCandidate(opts.name, opts.reference, opts.verifierName),
    templateId: "case.assigned",
    caseId: opts.caseId,
  });
}

export async function emailCandidateCleared(opts: {
  to: string; name: string; reference: string; caseId: string;
}) {
  await safeSend({
    to: opts.to,
    subject: `[Launch Pad] You're cleared — ${opts.reference}`,
    html: tpl.cleared(opts.name, opts.reference),
    templateId: "case.cleared",
    caseId: opts.caseId,
  });
}

export async function emailCandidateRejected(opts: {
  to: string; name: string; reference: string; reason?: string; caseId: string;
}) {
  await safeSend({
    to: opts.to,
    subject: `[Launch Pad] Case update — ${opts.reference}`,
    html: tpl.rejected(opts.name, opts.reference, opts.reason),
    templateId: "case.rejected",
    caseId: opts.caseId,
  });
}

export async function emailStageCorrection(opts: {
  to: string; name: string; reference: string; stage: StageType; comment: string; redeemUrl: string; caseId: string;
}) {
  await safeSend({
    to: opts.to,
    subject: `[Launch Pad] Action needed on ${stageLabels[opts.stage]} — ${opts.reference}`,
    html: tpl.correction(opts.name, opts.reference, stageLabels[opts.stage], opts.comment, opts.redeemUrl),
    templateId: "stage.correction",
    caseId: opts.caseId,
  });
}

export async function emailStageDecided(opts: {
  to: string; name: string; reference: string; stage: StageType; decision: "APPROVED" | "REJECTED"; comment?: string; caseId: string;
}) {
  const word = opts.decision === "APPROVED" ? "approved" : "rejected";
  await safeSend({
    to: opts.to,
    subject: `[Launch Pad] ${stageLabels[opts.stage]} ${word} — ${opts.reference}`,
    html: `<p>Hi ${opts.name},</p>
           <p>The <b>${stageLabels[opts.stage]}</b> stage on case <b>${opts.reference}</b> was <b>${word}</b>.</p>
           ${opts.comment ? `<blockquote style="margin:12px 0;border-left:3px solid #94a3b8;padding:6px 12px;color:#475569;background:#f8fafc">${opts.comment}</blockquote>` : ""}
           <p><a href="${env.APP_URL}/me">Open Launch Pad</a></p>`,
    templateId: opts.decision === "APPROVED" ? "stage.approved" : "stage.rejected",
    caseId: opts.caseId,
  });
}

export async function emailStageReminder(opts: {
  to: string; name: string; reference: string; stage: StageType; daysOpen: number; caseId: string;
}) {
  await safeSend({
    to: opts.to,
    subject: `[Launch Pad] Reminder: ${stageLabels[opts.stage]} pending — ${opts.reference}`,
    html: tpl.stageReminder(opts.name, opts.reference, stageLabels[opts.stage], opts.daysOpen),
    templateId: "stage.reminder",
    caseId: opts.caseId,
  });
}

// ─────────────────────────── BG team notifications ──────────────────────────

// (Per-stage verifier emails were retired in favour of the in-app bell —
// see notifyStageSubmittedFor in server/actions/stage.ts — plus the ONE
// consolidated email at final submit, emailProfileSubmittedForBgv below.)

export async function emailVerifierAssigned(opts: {
  caseId: string; verifierId: string;
}) {
  const [verifier, kase] = await Promise.all([
    db.user.findUnique({ where: { id: opts.verifierId } }),
    db.case.findUnique({
      where: { id: opts.caseId },
      include: { candidate: { include: { user: true } } },
    }),
  ]);
  if (!verifier?.email || !kase) return;
  const candidateName = kase.candidate.user.name ?? kase.candidate.user.email;
  await safeSend({
    to: verifier.email,
    subject: `[Launch Pad] New case assigned — ${kase.reference}`,
    html: tpl.verifierAssigned(verifier.name ?? "there", candidateName, kase.reference),
    templateId: "verifier.assigned",
    caseId: kase.id,
  });
}

// Consolidated "candidate finished everything" email — sent ONCE when the
// candidate hits the final "Submit profile for BGV" action (per-stage verifier
// emails are suppressed in favour of this single notification). Recipient is the
// assigned verifier, falling back to the bgv@ ops inbox when unassigned.
export async function emailProfileSubmittedForBgv(opts: { caseId: string }): Promise<void> {
  const c = await db.case.findUnique({
    where: { id: opts.caseId },
    include: { assignedVerifier: true, candidate: { include: { user: true } } },
  });
  if (!c) return;
  const to = c.assignedVerifier?.email ?? env.APP_SUPPORT_EMAIL;
  const candidateName = c.candidate.user.name ?? c.candidate.user.email;
  const workUrl = `${env.APP_URL}/work/case/${c.id}`;
  await safeSend({
    to,
    subject: `Profile submitted for BGV — ${candidateName} (${c.reference})`,
    html: `<p>Hi,</p>
           <p><b>${candidateName}</b> has completed and submitted <b>all stages</b> for case <b>${c.reference}</b>.</p>
           <p>The case is ready for review.</p>
           <p><a href="${workUrl}">Open the verifier workspace</a></p>`,
    templateId: "profile.submitted.bgv",
    caseId: c.id,
  });
}

// ───────────────────────── Requesting-company results ───────────────────────

/**
 * Return the verification RESULT to a non-listed requesting company by email
 * (listed/portal companies get the webhook callback instead — see
 * notifyPortalCaseStatus). CLEARED attaches the signed clearance PDF; REJECTED
 * sends status only. No-op when the case has no resultEmail.
 */
export async function emailCompanyResult(opts: {
  caseId: string;
  status: "CLEARED" | "REJECTED";
}): Promise<void> {
  const c = await db.case.findUnique({
    where: { id: opts.caseId },
    include: { candidate: { include: { user: true } } },
  });
  if (!c?.resultEmail) return;

  const candidateName = c.candidate.user.name ?? c.candidate.user.email;
  const company = c.companyName ?? "your company";
  const appSuffix = c.appName ? ` · ${c.appName}` : "";

  let attachments: { filename: string; content: Buffer; contentType?: string }[] | undefined;
  if (opts.status === "CLEARED" && c.clearedReportPath) {
    try {
      attachments = [
        {
          filename: `clearance-${c.reference}.pdf`,
          content: await storage.read(c.clearedReportPath),
          contentType: "application/pdf",
        },
      ];
    } catch (e) {
      logger.error("email.company_result.report_read_failed", {
        caseId: c.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const cleared = opts.status === "CLEARED";
  await safeSend({
    to: c.resultEmail,
    subject: `Background verification ${cleared ? "cleared" : "not cleared"} — ${candidateName} (${c.reference})`,
    html: `<p>Hello ${company},</p>
           <p>The background verification you requested for <b>${candidateName}</b>${appSuffix} (case <b>${c.reference}</b>) has been completed with the result: <b>${cleared ? "CLEARED" : "NOT CLEARED"}</b>.</p>
           ${cleared && attachments ? "<p>The signed clearance report is attached.</p>" : ""}
           ${!cleared ? "<p>For details about this outcome, please contact the ElvixIT BGV team by replying to this email.</p>" : ""}
           <p>— ElvixIT Background Verification</p>`,
    templateId: cleared ? "company.result.cleared" : "company.result.rejected",
    caseId: c.id,
    attachments,
  });
  await audit({ caseId: c.id, action: "company.result.sent", metadata: { to: c.resultEmail, status: opts.status } });
}

// ───────────────────────── External outreach ─────────────────────────────────

export async function emailRegistrarVerifications(opts: { caseId: string }) {
  const kase = await db.case.findUnique({
    where: { id: opts.caseId },
    include: { candidate: { include: { user: true } }, educations: true },
  });
  if (!kase) return;
  const candName = kase.candidate.user.name ?? kase.candidate.user.email;
  let sent = 0;
  for (const e of kase.educations) {
    if (!e.registrarEmail) continue;
    await safeSend({
      to: e.registrarEmail,
      subject: `Education verification request — ${candName}`,
      html: tpl.registrarVerification(
        "Registrar",
        candName,
        `${e.degree}${e.fieldOfStudy ? ` (${e.fieldOfStudy})` : ""}`,
        e.institution,
        kase.reference
      ),
      templateId: "education.registrar",
      caseId: kase.id,
    });
    sent++;
  }
  if (sent > 0) {
    await audit({ caseId: kase.id, action: "education.registrar.sent", metadata: { count: sent } });
  }
}

export async function emailEmployerVerifications(opts: { caseId: string }) {
  const kase = await db.case.findUnique({
    where: { id: opts.caseId },
    include: { candidate: { include: { user: true } }, employments: true },
  });
  if (!kase) return;
  const candName = kase.candidate.user.name ?? kase.candidate.user.email;
  let sent = 0;
  for (const emp of kase.employments) {
    if (!emp.managerEmail) continue;
    await safeSend({
      to: emp.managerEmail,
      subject: `Employment verification — ${candName}`,
      html: tpl.employerVerification(
        emp.managerName ?? "there",
        candName,
        emp.title,
        emp.employer,
        kase.reference
      ),
      templateId: "employment.verification",
      caseId: kase.id,
    });
    sent++;
  }
  if (sent > 0) {
    await audit({ caseId: kase.id, action: "employment.verification.sent", metadata: { count: sent } });
  }
}

// ────────────────────────── User lifecycle ─────────────────────────────────

export async function emailUserWelcome(opts: {
  to: string; name: string; role: string; tempPassword: string;
}) {
  await safeSend({
    to: opts.to,
    subject: `[Launch Pad] Your account is ready`,
    html: tpl.welcome(opts.name, opts.role, opts.tempPassword),
    templateId: "user.welcome",
  });
}

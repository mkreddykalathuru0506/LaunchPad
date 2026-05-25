import { env } from "./env";

function wrap(title: string, body: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:32px 0;margin:0">
  <table align="center" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e2e8f0">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:28px;height:28px;background:#6366f1;border-radius:6px"></span>
        <strong style="font-size:14px">Launch Pad</strong>
        <span style="margin-left:auto;font-size:11px;color:#64748b;letter-spacing:.08em;text-transform:uppercase">ElivixIT · BGV</span>
      </div>
    </td></tr>
    <tr><td style="padding:24px 28px;font-size:14px;line-height:1.6;color:#0f172a">${body}</td></tr>
    <tr><td style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0">
      You're receiving this because you have a Launch Pad case. Questions? Contact ${env.APP_SUPPORT_EMAIL}.
    </td></tr>
  </table>
</body></html>`;
}

export const tpl = {
  invite(name: string, reference: string, tempPassword: string) {
    return wrap(
      `Invitation: ${reference}`,
      `<p>Hi ${name},</p>
       <p>You've been invited by ElivixIT to complete your background verification through <b>Launch Pad</b>.</p>
       <p><b>Case reference:</b> ${reference}<br/>
       <b>Temporary password:</b> <code>${tempPassword}</code> (please change after first sign-in).</p>
       <p><a href="${env.APP_URL}/login" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Sign in to Launch Pad</a></p>`
    );
  },
  candidateBgvInvite(opts: {
    name: string;
    candidateCode: string;
    caseReference: string;
    email: string;
    tempPassword: string;
    loginUrl: string;
    magicLink: string;
  }) {
    return wrap(
      `Start your background verification — ${opts.caseReference}`,
      `<p>Hi ${opts.name},</p>
       <p>The hiring team at ElvixIT has asked us to start your background verification on <b>Launch Pad</b>. Below are the details and credentials you'll need to sign in.</p>
       <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:14px 0;font-size:13px">
         <tr><td style="color:#64748b">Candidate ID</td><td><b>${opts.candidateCode}</b></td></tr>
         <tr><td style="color:#64748b">Case reference</td><td><b>${opts.caseReference}</b></td></tr>
         <tr><td style="color:#64748b">Login email</td><td><code>${opts.email}</code></td></tr>
         <tr><td style="color:#64748b">Temporary password</td><td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${opts.tempPassword}</code></td></tr>
       </table>
       <p><b>Important:</b> this temporary password is shown only once in this email. You will be asked to change it the first time you sign in.</p>
       <p style="margin:18px 0">
         <a href="${opts.loginUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Sign in to Launch Pad</a>
       </p>
       <p style="color:#64748b;font-size:12px">Sign-in URL: <a href="${opts.loginUrl}">${opts.loginUrl}</a></p>
       <p style="color:#64748b;font-size:12px">Trouble signing in? You can also use this one-time magic link (valid for 14 days): <a href="${opts.magicLink}">open Launch Pad</a>.</p>
       <p style="color:#64748b;font-size:12px">If you didn't expect this email, please contact ${env.APP_SUPPORT_EMAIL}.</p>`
    );
  },
  stageSubmitted(reference: string, stage: string, candidate: string) {
    return wrap(
      `${stage} submitted: ${reference}`,
      `<p>${candidate} has submitted the <b>${stage}</b> stage of case <b>${reference}</b>.</p>
       <p><a href="${env.APP_URL}/work/case">Open the queue</a></p>`
    );
  },
  correction(name: string, reference: string, stage: string, comment: string, redeemUrl: string) {
    return wrap(
      `Action needed on ${stage}`,
      `<p>Hi ${name},</p>
       <p>Your verifier has asked for changes on the <b>${stage}</b> stage of case <b>${reference}</b>.</p>
       <blockquote style="margin:12px 0;border-left:3px solid #6366f1;padding:6px 12px;color:#475569;background:#f1f5f9">${comment}</blockquote>
       <p><a href="${redeemUrl}" style="display:inline-block;background:#f59e0b;color:#1c1917;padding:10px 16px;border-radius:6px;text-decoration:none">Open the stage to fix it</a></p>
       <p style="color:#64748b;font-size:12px">This link is single-use and expires in 7 days.</p>`
    );
  },
  cleared(name: string, reference: string) {
    return wrap(
      `You're cleared — ${reference}`,
      `<p>Hi ${name},</p>
       <p>All verification stages on your case <b>${reference}</b> have been approved.</p>
       <p>Your clearance is on file with the hiring team. Welcome aboard.</p>`
    );
  },
  magicLink(name: string, link: string) {
    return wrap(
      "Sign in to Launch Pad",
      `<p>Hi ${name},</p>
       <p>Use the link below to sign in. It expires in 30 minutes.</p>
       <p><a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Sign in</a></p>`
    );
  },
  welcome(name: string, role: string, tempPassword: string) {
    return wrap(
      `Welcome to Launch Pad`,
      `<p>Hi ${name},</p>
       <p>An account has been created for you on <b>Launch Pad</b> with role <b>${role}</b>.</p>
       <p>Sign in here: <a href="${env.APP_URL}/login">${env.APP_URL}/login</a><br/>
       Temporary password: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
       <p>You will be asked to change your password on first sign-in.</p>`
    );
  },
  verifierAssigned(verifierName: string, candidateName: string, reference: string) {
    return wrap(
      `New case assigned: ${reference}`,
      `<p>Hi ${verifierName},</p>
       <p>You have been assigned to verify <b>${candidateName}</b>'s case <b>${reference}</b>.</p>
       <p><a href="${env.APP_URL}/work/case" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open Launch Pad queue</a></p>`
    );
  },
  rejected(name: string, reference: string, reason?: string) {
    return wrap(
      `Case update: ${reference}`,
      `<p>Hi ${name},</p>
       <p>After review, the verification on your case <b>${reference}</b> was <b>not approved</b>.</p>
       ${reason ? `<blockquote style="margin:12px 0;border-left:3px solid #ef4444;padding:6px 12px;color:#475569;background:#fef2f2">${reason}</blockquote>` : ""}
       <p>If you believe this is in error, please contact <a href="mailto:${env.APP_SUPPORT_EMAIL}">${env.APP_SUPPORT_EMAIL}</a>.</p>`
    );
  },
  referenceOutreach(refName: string, candidateName: string, link: string, reference: string) {
    return wrap(
      `Reference request for ${candidateName}`,
      `<p>Hi ${refName},</p>
       <p>${candidateName} has applied to a role at ElivixIT and has listed you as a professional reference. We'd be grateful for a few minutes of your time.</p>
       <p>Please complete the short structured questionnaire here:</p>
       <p><a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Provide your reference</a></p>
       <p style="color:#64748b;font-size:12px">Case ID: ${reference} · Your responses are confidential and shared only with the hiring team.</p>`
    );
  },
  registrarVerification(registrarName: string, candidate: string, degree: string, institution: string, reference: string) {
    return wrap(
      `Education verification request — ${candidate}`,
      `<p>To the Registrar of <b>${institution}</b>,</p>
       <p>ElivixIT is conducting background verification for <b>${candidate}</b>, who lists the following qualification:</p>
       <ul>
         <li><b>Degree:</b> ${degree}</li>
         <li><b>Institution:</b> ${institution}</li>
       </ul>
       <p>Could you confirm that this individual was enrolled and graduated as stated? You may reply directly to this email.</p>
       <p style="color:#64748b;font-size:12px">Case reference: ${reference}. Compliant with applicable privacy regulations (DPDP / FERPA / GDPR).</p>`
    );
  },
  employerVerification(managerName: string, candidate: string, role: string, employer: string, reference: string) {
    return wrap(
      `Employment verification — ${candidate}`,
      `<p>Hi ${managerName},</p>
       <p>ElivixIT is conducting background verification for <b>${candidate}</b>, who lists the following employment with <b>${employer}</b>:</p>
       <ul>
         <li><b>Role:</b> ${role}</li>
         <li><b>Employer:</b> ${employer}</li>
       </ul>
       <p>Could you confirm the role, employment dates, and overall conduct? A brief reply to this email is sufficient.</p>
       <p style="color:#64748b;font-size:12px">Case reference: ${reference}. Compliant with applicable privacy regulations.</p>`
    );
  },
  caseAssignedToCandidate(name: string, reference: string, verifierName: string) {
    return wrap(
      `Your verifier — ${reference}`,
      `<p>Hi ${name},</p>
       <p><b>${verifierName}</b> from the ElivixIT BG team has been assigned to your case <b>${reference}</b>.</p>
       <p>If you have any questions, contact <a href="mailto:${env.APP_SUPPORT_EMAIL}">${env.APP_SUPPORT_EMAIL}</a>.</p>`
    );
  },
  stageReminder(name: string, reference: string, stage: string, daysOpen: number) {
    return wrap(
      `Reminder: ${stage} still pending`,
      `<p>Hi ${name},</p>
       <p>The <b>${stage}</b> stage on your case <b>${reference}</b> has been open for <b>${daysOpen} day${daysOpen === 1 ? "" : "s"}</b>.</p>
       <p>Please complete it at your earliest convenience to keep your start date on track.</p>
       <p><a href="${env.APP_URL}/me" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open Launch Pad</a></p>`
    );
  },
};

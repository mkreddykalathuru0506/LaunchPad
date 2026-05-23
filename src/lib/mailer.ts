import { promises as fs } from "node:fs";
import { join } from "node:path";
import { env } from "./env";
import { db } from "./db";
import { logger } from "./logger";

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  caseId?: string;
};

export interface MailerAdapter {
  send(mail: Mail): Promise<{ ok: boolean; error?: string }>;
}

class ConsoleMailer implements MailerAdapter {
  async send(mail: Mail) {
    logger.info("email.console", { to: mail.to, subject: mail.subject });
    return { ok: true };
  }
}

class FilesystemMailer implements MailerAdapter {
  async send(mail: Mail) {
    const dir = "./outbox";
    await fs.mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${mail.to.replace(/[^a-z0-9.@_-]/gi, "_")}.eml`;
    const content =
      `From: ${env.MAILER_FROM}\r\n` +
      `To: ${mail.to}\r\n` +
      `Subject: ${mail.subject}\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `Date: ${new Date().toUTCString()}\r\n\r\n` +
      mail.html;
    await fs.writeFile(join(dir, filename), content);
    logger.info("email.filesystem", { file: filename, to: mail.to, subject: mail.subject });
    return { ok: true };
  }
}

class ResendMailer implements MailerAdapter {
  async send(mail: Mail) {
    if (!env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY missing" };
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.MAILER_FROM,
          to: [mail.to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      });
      if (!res.ok) return { ok: false, error: `Resend ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
}

const adapter: MailerAdapter =
  env.MAILER_DRIVER === "console" ? new ConsoleMailer() :
  env.MAILER_DRIVER === "resend"  ? new ResendMailer() :
  new FilesystemMailer();

export async function sendMail(mail: Mail): Promise<void> {
  const result = await adapter.send(mail);
  await db.emailLog.create({
    data: {
      toEmail: mail.to,
      fromEmail: env.MAILER_FROM,
      subject: mail.subject,
      templateId: mail.templateId,
      status: result.ok ? "sent" : "failed",
      errorText: result.ok ? null : result.error ?? "unknown",
      caseId: mail.caseId,
    },
  });
}

import { promises as fs } from "node:fs";
import { join } from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
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
  /** Binary attachments (e.g. the clearance PDF returned to a requesting company). */
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
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
    const filename = `${Date.now()}-${mail.to.replace(/[^a-z0-9.@_-]/gi, "_")}.eml`;
    // Dev driver: note attachments in the body rather than building MIME parts.
    const attachmentNote = mail.attachments?.length
      ? `<hr/><p>[dev outbox] Attachments: ${mail.attachments
          .map((a) => `${a.filename} (${Math.ceil(a.content.length / 1024)} KB)`)
          .join(", ")}</p>`
      : "";
    const content =
      `From: ${env.MAILER_FROM}\r\n` +
      `To: ${mail.to}\r\n` +
      `Subject: ${mail.subject}\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `Date: ${new Date().toUTCString()}\r\n\r\n` +
      mail.html +
      attachmentNote;
    // Don't let a bad outbox permission take down the email-send pipeline —
    // we still want the EmailLog row (with bodyHtml) for traceability.
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(join(dir, filename), content);
      logger.info("email.filesystem", { file: filename, to: mail.to, subject: mail.subject });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("email.filesystem_failed", { to: mail.to, subject: mail.subject, error: msg });
      return { ok: false, error: msg };
    }
  }
}

class SmtpMailer implements MailerAdapter {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
    const port = Number(env.SMTP_PORT ?? "587");
    // 465 → implicit TLS; 587 → STARTTLS (secure: false + requireTLS)
    const secure = env.SMTP_SECURE === "true" || port === 465;
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure,
      requireTLS: !secure,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      connectionTimeout: 15_000,
      socketTimeout: 30_000,
    });
    return this.transporter;
  }

  async send(mail: Mail) {
    const tx = this.getTransporter();
    if (!tx) return { ok: false, error: "SMTP_HOST/USER/PASS missing" };
    try {
      const info = await tx.sendMail({
        from: env.MAILER_FROM,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        attachments: mail.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      logger.info("email.smtp", {
        to: mail.to,
        subject: mail.subject,
        messageId: info.messageId,
        accepted: info.accepted?.length ?? 0,
        rejected: info.rejected?.length ?? 0,
      });
      if (info.rejected && info.rejected.length > 0) {
        return { ok: false, error: `Rejected: ${info.rejected.join(",")}` };
      }
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("email.smtp_failed", { to: mail.to, error: msg });
      return { ok: false, error: msg };
    }
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
          attachments: mail.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content.toString("base64"),
          })),
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
  env.MAILER_DRIVER === "smtp"    ? new SmtpMailer() :
  env.MAILER_DRIVER === "resend"  ? new ResendMailer() :
  new FilesystemMailer();

export async function sendMail(mail: Mail): Promise<void> {
  const result = await adapter.send(mail);
  await db.emailLog.create({
    data: {
      toEmail: mail.to,
      fromEmail: env.MAILER_FROM,
      subject: mail.subject,
      bodyHtml: mail.html,
      templateId: mail.templateId,
      status: result.ok ? "sent" : "failed",
      errorText: result.ok ? null : result.error ?? "unknown",
      caseId: mail.caseId,
    },
  });
}

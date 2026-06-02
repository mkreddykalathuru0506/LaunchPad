import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(16),

  MAILER_DRIVER: z.enum(["console", "filesystem", "resend", "smtp"]).default("filesystem"),
  MAILER_FROM: z.string().default("Launch Pad <no-reply@launchpad.local>"),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./uploads"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  ADAPTER_IDENTITY: z.string().default("mock"),
  ADAPTER_ADDRESS: z.string().default("mock"),
  ADAPTER_EDUCATION: z.string().default("mock"),
  ADAPTER_EMPLOYMENT: z.string().default("mock"),
  ADAPTER_CRIMINAL: z.string().default("mock"),
  ADAPTER_PHOTO: z.string().default("mock"),
  ADAPTER_VIDEO: z.string().default("mock"),
  ADAPTER_REFERENCE: z.string().default("mock"),

  APP_NAME: z.string().default("Launch Pad"),
  APP_BRAND_COLOR: z.string().default("#6366f1"),
  APP_SUPPORT_EMAIL: z.string().email().default("bgv@elvixit.com"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // ───────── Company-portal BGV integration ─────────
  // Shared HMAC secret used to authenticate both inbound (portal → launchpad
  // case creation) and outbound (launchpad → portal status callback) webhooks.
  PORTAL_WEBHOOK_SECRET: z.string().optional(),
  // Portal callback URL invoked when a case reaches a terminal status.
  PORTAL_BGV_CALLBACK_URL: z
    .string()
    .url()
    .default("https://portal.elvixit.com/api/v1/jobs/webhooks/bgv"),
  // Kill-switch for outbound notifications (default on).
  BGV_WEBHOOK_ENABLED: z.enum(["true", "false"]).default("true"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment");
}

export const env = parsed.data;

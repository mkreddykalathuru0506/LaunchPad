"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { env } from "@/lib/env";
import { randomToken } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { headers } from "next/headers";

const schema = z.object({ email: z.string().email() });

export async function requestPasswordReset(formData: FormData) {
  const ip = headers().get("x-forwarded-for") ?? "unknown";
  const limited = rateLimit(`forgot:${ip}`, 3, 60_000);
  if (!limited.ok) redirect("/forgot?status=rate");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/forgot?status=invalid");

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (user) {
    const token = randomToken(32);
    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires: new Date(Date.now() + 30 * 60_000),
      },
    });
    await sendMail({
      to: user.email,
      subject: "Sign in to Launch Pad",
      html: `
        <p>Hi ${user.name ?? "there"},</p>
        <p>Use the link below to sign in. It expires in 30 minutes.</p>
        <p><a href="${env.APP_URL}/api/auth-link?token=${token}">Sign in to Launch Pad</a></p>
        <p>If you didn't request this, you can ignore the email.</p>
      `,
      templateId: "auth.magic-link",
    });
  }
  redirect("/forgot?status=sent");
}

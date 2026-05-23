import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "At least 10 characters")
  .max(128, "Maximum 128 characters")
  .refine((p) => /[a-z]/.test(p), "At least one lowercase letter")
  .refine((p) => /[A-Z]/.test(p), "At least one uppercase letter")
  .refine((p) => /\d/.test(p), "At least one digit")
  .refine((p) => /[^A-Za-z0-9]/.test(p), "At least one symbol");

export function checkPasswordStrength(p: string): {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  if (p.length >= 10) score++;
  if (p.length >= 14) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;

  if (p.length < 10) feedback.push("Use at least 10 characters");
  if (!/[A-Z]/.test(p)) feedback.push("Add uppercase letters");
  if (!/[a-z]/.test(p)) feedback.push("Add lowercase letters");
  if (!/\d/.test(p)) feedback.push("Add a digit");
  if (!/[^A-Za-z0-9]/.test(p)) feedback.push("Add a symbol");
  if (/(.)\1{2,}/.test(p)) feedback.push("Avoid repeated characters");

  return { score: Math.min(4, score) as 0 | 1 | 2 | 3 | 4, feedback };
}

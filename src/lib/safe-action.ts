import { logger } from "./logger";

/**
 * Wraps a server action / background task so that any thrown error is logged
 * with internal detail, but re-thrown as a generic message — this prevents
 * Prisma errors, query text, or stack traces from leaking to clients.
 */
export async function safeAction<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error("safeAction.failed", { message, stack });
    throw new Error("Something went wrong. Please try again.");
  }
}

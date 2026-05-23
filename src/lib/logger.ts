import { env } from "./env";

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function log(level: Level, message: string, ctx?: Record<string, unknown>) {
  if (order[level] < order[env.LOG_LEVEL]) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(ctx ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => log("debug", m, c),
  info: (m: string, c?: Record<string, unknown>) => log("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => log("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => log("error", m, c),
};

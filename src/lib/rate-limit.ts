type Bucket = { tokens: number; updatedAt: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): { ok: boolean; remaining: number } {
  const now = Date.now();
  const b = store.get(key) ?? { tokens: limit, updatedAt: now };
  const elapsed = now - b.updatedAt;
  const refill = Math.floor((elapsed / windowMs) * limit);
  const tokens = Math.min(limit, b.tokens + refill);
  if (tokens <= 0) {
    store.set(key, { tokens, updatedAt: now });
    return { ok: false, remaining: 0 };
  }
  store.set(key, { tokens: tokens - 1, updatedAt: now });
  return { ok: true, remaining: tokens - 1 };
}

/**
 * In-memory rate limiter for AI API routes.
 * Upgrade path: replace `store` with an ioredis/upstash-redis client.
 */

export type RateLimitAction = "simulate" | "extend" | "scrape";

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

const LIMITS: Record<RateLimitAction, { max: number; windowMs: number }> = {
  simulate: { max: 10, windowMs: 60 * 60 * 1_000 },        // 10 / hour
  extend:   { max: 30, windowMs: 60 * 60 * 1_000 },        // 30 / hour
  scrape:   { max: 5,  windowMs: 24 * 60 * 60 * 1_000 },   // 5  / day
};

// In-process store — shared across requests within the same server instance.
// key = `${userId}:${action}`
const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  userId: string,
  action: RateLimitAction
): RateLimitResult {
  const key = `${userId}:${action}`;
  const limit = LIMITS[action];
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + limit.windowMs };
    store.set(key, entry);
  }

  if (entry.count >= limit.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1_000),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit.max - entry.count,
    resetAt: entry.resetAt,
    retryAfterSeconds: 0,
  };
}

/** Call periodically (e.g. via a setInterval) to avoid unbounded memory growth. */
export function purgeExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

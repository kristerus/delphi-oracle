import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const LIMITS = {
  simulate: { max: 10, windowMs: 60 * 60 * 1000 },   // 10/hr
  extend:   { max: 30, windowMs: 60 * 60 * 1000 },   // 30/hr
  scrape:   { max: 5,  windowMs: 24 * 60 * 60 * 1000 }, // 5/day
} as const;

export type RateLimitAction = keyof typeof LIMITS;

export async function checkRateLimit(
  userId: string,
  action: RateLimitAction
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const { max, windowMs } = LIMITS[action];
  const now = new Date();
  // Truncate to window start
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  // Upsert: increment count if row exists for this window, else insert with count=1
  const result = await db
    .insert(rateLimits)
    .values({
      userId,
      action,
      windowStart,
      count: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [rateLimits.userId, rateLimits.action, rateLimits.windowStart],
      set: {
        count: sql`${rateLimits.count} + 1`,
        updatedAt: now,
      },
    })
    .returning();

  const count = result[0]?.count ?? 1;
  const allowed = count <= max;
  const remaining = Math.max(0, max - count);

  return { allowed, remaining, resetAt };
}

export async function getRateLimitStatus(
  userId: string,
  action: RateLimitAction
): Promise<{ used: number; max: number; remaining: number; resetAt: Date }> {
  const { max, windowMs } = LIMITS[action];
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  const row = await db.query.rateLimits.findFirst({
    where: and(
      eq(rateLimits.userId, userId),
      eq(rateLimits.action, action),
      eq(rateLimits.windowStart, windowStart)
    ),
  });

  const used = row?.count ?? 0;
  return { used, max, remaining: Math.max(0, max - used), resetAt };
}

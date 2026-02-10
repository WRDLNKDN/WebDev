/**
 * Simple in-memory rate limit for Weirdling generation (per user).
 * Epic: rate limits per-user and per-IP; friendly UI errors.
 * For production, use Redis or similar.
 */

const windowMs = 60 * 1000; // 1 minute
const maxPerWindow = 10;

const userCounts = new Map<string, { count: number; resetAt: number }>();

function getKey(userId: string): string {
  return `user:${userId}`;
}

function now(): number {
  return Date.now();
}

export function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const key = getKey(userId);
  const entry = userCounts.get(key);

  if (!entry) {
    userCounts.set(key, { count: 1, resetAt: now() + windowMs });
    return { allowed: true };
  }

  if (now() > entry.resetAt) {
    userCounts.set(key, { count: 1, resetAt: now() + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxPerWindow) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now()) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

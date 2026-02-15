/**
 * Rate limit for Directory API (per user).
 * NFR #265: Abuse protection for member discovery endpoints.
 * List (GET): 100/min. Actions (connect/accept/decline/disconnect): 30/min.
 */

const LIST_WINDOW_MS = 60 * 1000;
const LIST_MAX = 100;
const ACTION_WINDOW_MS = 60 * 1000;
const ACTION_MAX = 30;

const listCounts = new Map<string, { count: number; resetAt: number }>();
const actionCounts = new Map<string, { count: number; resetAt: number }>();

function now(): number {
  return Date.now();
}

function check(
  map: Map<string, { count: number; resetAt: number }>,
  userId: string,
  windowMs: number,
  max: number,
): { allowed: boolean; retryAfter?: number } {
  const entry = map.get(userId);

  if (!entry) {
    map.set(userId, { count: 1, resetAt: now() + windowMs });
    return { allowed: true };
  }

  if (now() > entry.resetAt) {
    map.set(userId, { count: 1, resetAt: now() + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now()) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export type DirectoryRateLimitAction = 'list' | 'action';

export function checkDirectoryRateLimit(
  userId: string,
  action: DirectoryRateLimitAction,
): { allowed: boolean; retryAfter?: number } {
  if (action === 'list') {
    return check(listCounts, userId, LIST_WINDOW_MS, LIST_MAX);
  }
  return check(actionCounts, userId, ACTION_WINDOW_MS, ACTION_MAX);
}

/**
 * Short-lived cache for profile validation from AuthCallback.
 * Survives client-side navigation quirks on Vercel where location.state can be lost.
 * TTL 15s — only used for the immediate post-OAuth redirect.
 */

import type { ProfileOnboardingCheck } from './profileOnboarding';

const KEY = 'wrdlnkdn_profile_validated';
const ONBOARDED_KEY_PREFIX = 'wrdlnkdn_profile_onboarded';
const TTL_MS = 15_000;

type Stored = {
  profile: ProfileOnboardingCheck;
  userId: string;
  ts: number;
};

export function setProfileValidated(
  userId: string,
  profile: ProfileOnboardingCheck,
): void {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ profile, userId, ts: Date.now() } satisfies Stored),
    );
    // Durable marker: if we've validated onboarding once, trust this user as
    // onboarded during transient auth/profile hydration failures.
    localStorage.setItem(`${ONBOARDED_KEY_PREFIX}:${userId}`, '1');
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

export function getProfileValidated(
  userId: string,
): ProfileOnboardingCheck | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Stored;
    if (data.userId !== userId) return null;
    if (Date.now() - data.ts > TTL_MS) return null;
    sessionStorage.removeItem(KEY);
    return data.profile;
  } catch {
    return null;
  }
}

export function hasProfileOnboardedSticky(userId: string): boolean {
  try {
    return localStorage.getItem(`${ONBOARDED_KEY_PREFIX}:${userId}`) === '1';
  } catch {
    return false;
  }
}

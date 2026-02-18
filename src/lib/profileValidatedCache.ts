/**
 * Short-lived cache for profile validation from AuthCallback.
 * Survives client-side navigation quirks on Vercel where location.state can be lost.
 * TTL 15s — only used for the immediate post-OAuth redirect.
 */

import type { ProfileOnboardingCheck } from './profileOnboarding';

const KEY = 'wrdlnkdn_profile_validated';
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

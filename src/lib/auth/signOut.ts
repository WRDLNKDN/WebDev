/**
 * Centralized sign-out and auth storage cleanup.
 * Use this everywhere we sign out so session and caches are cleared consistently
 * and we avoid odd states (stale session, wrong user's onboarded state).
 */

import { clearProfileValidationCache } from '../profile/profileValidatedCache';
import { AUTH_STORAGE_KEY, supabase } from './supabaseClient';

/** All known env-prefixed auth keys (so sign-out clears any env's session on this origin). */
const AUTH_STORAGE_KEYS = [
  AUTH_STORAGE_KEY,
  'uat-sb-wrdlnkdn-auth',
  'prod-sb-wrdlnkdn-auth',
  'dev-sb-wrdlnkdn-auth',
];

/**
 * Remove auth tokens from localStorage so the next visit doesn't see a stale session.
 * Safe to call when already signed out (e.g. on init if session is null).
 */
export function clearAuthStorage(): void {
  try {
    AUTH_STORAGE_KEYS.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore (private mode, etc.)
  }
}

/**
 * Sign out from Supabase (all tabs if scope is global), then clear auth storage
 * and profile/onboarded caches so the next visit or next user isn't in an odd state.
 * Does not clear all cookies or all localStorage — only auth-related keys.
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } finally {
    clearAuthStorage();
    clearProfileValidationCache();
  }
}

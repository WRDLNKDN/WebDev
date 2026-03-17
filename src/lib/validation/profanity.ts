/**
 * Profanity validation for freeform text (bio, interests Other, industries Other, etc.).
 * Moderation stack: OSS (leo-profanity) + admin blocklist (profanity_overrides) + admin allowlist (profanity_allowlist).
 */

import leoProfanity from 'leo-profanity';
import { supabase } from '../auth/supabaseClient';

export const PROFANITY_ERROR_MESSAGE =
  'Please choose a different entry. That term is not allowed.';

/** Message for custom interest validation (Join, Dashboard interests Other). */
export const PROFANITY_ERROR_MESSAGE_INTEREST =
  'Please choose a different interest. That term is not allowed.';

let cachedBlocklist: string[] | null = null;
let cachedAllowlist: string[] | null = null;

/**
 * Fetches admin blocklist (terms to block in addition to OSS list).
 * Result is cached for the session.
 */
export async function getProfanityOverrides(): Promise<string[]> {
  if (cachedBlocklist !== null) return cachedBlocklist;
  const { data, error } = await supabase
    .from('profanity_overrides')
    .select('word');
  if (error) {
    console.warn('[profanity] Failed to load blocklist:', error.message);
    cachedBlocklist = [];
    return cachedBlocklist;
  }
  const words = (data ?? [])
    .map((row: { word: string }) => row.word?.trim())
    .filter((w: string) => w.length > 0);
  cachedBlocklist = words;
  return cachedBlocklist;
}

/**
 * Fetches admin allowlist (terms allowed even when matched by OSS filter).
 * Result is cached for the session.
 */
export async function getProfanityAllowlist(): Promise<string[]> {
  if (cachedAllowlist !== null) return cachedAllowlist;
  const { data, error } = await supabase
    .from('profanity_allowlist')
    .select('word');
  if (error) {
    console.warn('[profanity] Failed to load allowlist:', error.message);
    cachedAllowlist = [];
    return cachedAllowlist;
  }
  const words = (data ?? [])
    .map((row: { word: string }) => row.word?.trim())
    .filter((w: string) => w.length > 0);
  cachedAllowlist = words;
  return cachedAllowlist;
}

/**
 * Validates that text does not contain known offensive or inappropriate language.
 * Order: 1) Admin blocklist (reject), 2) OSS list with admin allowlist applied (reject if matched and not allowlisted).
 * Empty/whitespace-only text passes.
 * @param text - Input to validate
 * @param blocklist - Admin blocklist (from getProfanityOverrides)
 * @param allowlist - Admin allowlist (from getProfanityAllowlist); terms in this list are not rejected by OSS check
 * @param message - Optional custom error message (e.g. PROFANITY_ERROR_MESSAGE_INTEREST)
 * @throws Error if validation fails
 */
export function validateProfanity(
  text: string,
  blocklist: string[] = [],
  allowlist: string[] = [],
  message: string = PROFANITY_ERROR_MESSAGE,
): void {
  const normalized = text.trim();
  if (!normalized) return;

  const lower = normalized.toLowerCase();

  for (const w of blocklist) {
    const term = w.trim().toLowerCase();
    if (!term) continue;
    if (lower.includes(term)) {
      throw new Error(message);
    }
  }

  try {
    if (allowlist.length > 0) {
      leoProfanity.addWhitelist(allowlist);
    }
    if (leoProfanity.check(normalized)) {
      throw new Error(message);
    }
  } finally {
    if (allowlist.length > 0) {
      leoProfanity.clearWhitelist();
    }
  }
}

/**
 * Validates text after loading blocklist and allowlist from Supabase.
 * Use at submission time for any freeform field.
 * @param text - Input to validate
 * @param message - Optional custom error message (e.g. PROFANITY_ERROR_MESSAGE_INTEREST)
 */
export async function validateProfanityAsync(
  text: string,
  message: string = PROFANITY_ERROR_MESSAGE,
): Promise<void> {
  const [blocklist, allowlist] = await Promise.all([
    getProfanityOverrides(),
    getProfanityAllowlist(),
  ]);
  validateProfanity(text, blocklist, allowlist, message);
}

/**
 * Clears cached blocklist and allowlist (e.g. for tests or after admin updates).
 */
export function clearProfanityOverridesCache(): void {
  cachedBlocklist = null;
  cachedAllowlist = null;
}

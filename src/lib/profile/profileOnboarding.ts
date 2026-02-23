/**
 * Profile onboarding: shared logic for "has user completed signup?"
 * Used by RequireOnboarded, Home, and AuthCallback to avoid Feed flicker.
 *
 * RESILIENT CHECK: Handles cases where UPDATE partially fails on UAT.
 * If a user has join_reason or participation_style but no display_name,
 * they clearly completed signup but the UPDATE didn't fully persist —
 * we count them as onboarded to avoid infinite /join loops.
 */

export type ProfileOnboardingCheck = {
  display_name: string | null;
  join_reason?: string[] | null;
  participation_style?: string[] | null;
  policy_version?: string | null;
  status?: string | null;
};

/**
 * True if profile has completed setup.
 *
 * Primary check: display_name exists.
 * Fallback check: if display_name is missing but they have values data,
 * they did complete signup (UPDATE just failed) - count as onboarded.
 */
export function isProfileOnboarded(
  profile: ProfileOnboardingCheck | null | undefined,
): boolean {
  if (!profile) return false;

  // Happy path: display_name exists
  if (profile.display_name?.trim()) return true;

  // Fallback: display_name missing, but they have values data?
  // This means signup UPDATE partially failed — don't loop them
  const hasValues =
    (profile.join_reason?.length ?? 0) > 0 ||
    (profile.participation_style?.length ?? 0) > 0;

  return hasValues;
}

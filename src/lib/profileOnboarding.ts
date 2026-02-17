/**
 * Profile onboarding: shared logic for "has user completed signup?"
 * Used by RequireOnboarded, Home, and AuthCallback to avoid Feed flicker.
 *
 * Lenient check: display_name is sufficient. Legacy users and those who completed
 * an older signup flow may not have policy_version or join_reason/participation_style.
 */

export type ProfileOnboardingCheck = {
  display_name: string | null;
  join_reason?: string[] | null;
  participation_style?: string[] | null;
  policy_version?: string | null;
};

/** True if profile has completed setup (has display_name). */
export function isProfileOnboarded(
  profile: ProfileOnboardingCheck | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(profile.display_name?.trim());
}

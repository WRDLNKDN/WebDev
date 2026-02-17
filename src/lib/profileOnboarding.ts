/**
 * Profile onboarding: shared logic for "has user completed signup?"
 * Used by RequireOnboarded, Home, and AuthCallback to avoid Feed flicker.
 */

export type ProfileOnboardingCheck = {
  display_name: string | null;
  join_reason: string[] | null;
  participation_style: string[] | null;
  policy_version: string | null;
};

/** True if profile has the minimum required fields from signup wizard. */
export function isProfileOnboarded(
  profile: ProfileOnboardingCheck | null | undefined,
): boolean {
  if (!profile) return false;
  const hasPolicyVersion = Boolean(profile.policy_version);
  const hasValues =
    (profile.join_reason?.length ?? 0) > 0 &&
    (profile.participation_style?.length ?? 0) > 0;
  const hasDisplayName = Boolean(profile.display_name?.trim());
  return hasPolicyVersion && hasValues && hasDisplayName;
}

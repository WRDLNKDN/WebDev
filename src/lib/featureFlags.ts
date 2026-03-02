/**
 * Feature flags are managed in the Admin panel (Admin → Feature Flags) and
 * read at runtime via context/FeatureFlagsContext (useFeatureFlag).
 *
 * This file is kept for optional env override or build-time use only.
 * Set VITE_FEATURE_EVENTS=true to enable Events when DB flags are not yet loaded (fallback).
 */
export const FEATURE_EVENTS_ENABLED =
  (import.meta.env.VITE_FEATURE_EVENTS as string | undefined)?.toLowerCase() ===
  'true';

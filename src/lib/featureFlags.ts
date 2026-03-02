/**
 * Feature flags (from env). Beta: Events is OFF until explicitly enabled.
 * Set VITE_FEATURE_EVENTS=true to enable Events surface in nav and routing.
 */
export const FEATURE_EVENTS_ENABLED =
  (import.meta.env.VITE_FEATURE_EVENTS as string | undefined)?.toLowerCase() ===
  'true';

/**
 * App environment: UAT vs PROD (and local dev).
 * Set VITE_APP_ENV in Vercel per environment so UAT and Production builds are distinct.
 */

export type AppEnv = 'uat' | 'production' | 'development';

const raw =
  (import.meta.env.VITE_APP_ENV as string | undefined)?.trim().toLowerCase() ??
  '';

export const APP_ENV: AppEnv =
  raw === 'uat'
    ? 'uat'
    : raw === 'production' || raw === 'prod'
      ? 'production'
      : 'development';

export const isUat = APP_ENV === 'uat';
export const isProduction = APP_ENV === 'production';
export const isDevelopment = APP_ENV === 'development';

/**
 * True when the browser host looks like the UAT site (e.g. webdev-uat.vercel.app).
 * Used so prod-only gates (coming soon: no Join on home) do not apply when UAT is
 * misconfigured with `VITE_APP_ENV=production` on the Vercel Production slot.
 */
export function isUatHostname(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h.includes('webdev-uat') || h.includes('uat.');
}

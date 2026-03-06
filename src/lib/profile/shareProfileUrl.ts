/**
 * Build the public share profile URL for a given token.
 * Uses current origin in the browser so links work in UAT vs Prod.
 * Do not hardcode a base domain.
 */
export function buildShareProfileUrl(
  shareToken: string,
  /** Optional origin (e.g. in tests or SSR). In browser, falls back to window.location.origin. */
  baseOrigin?: string,
): string {
  const origin =
    baseOrigin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const path = `/p/${shareToken}`;
  return origin ? `${origin}${path}` : path;
}

/**
 * Opens an app path in a new browser tab (same origin). Use when the SPA route
 * should load in a separate tab.
 */
export function openSameOriginPathInNewTab(path: string): void {
  if (typeof window === 'undefined') return;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  window.open(
    `${window.location.origin}${normalized}`,
    '_blank',
    'noopener,noreferrer',
  );
}

/**
 * Opens an absolute http(s) URL in a new browser tab. Use for Store nav so the
 * real storefront opens as a full site tab, not the in-app `/store` embed route.
 */
export function openExternalUrlInNewTab(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
    window.open(parsed.href, '_blank', 'noopener,noreferrer');
  } catch {
    /* invalid URL */
  }
}

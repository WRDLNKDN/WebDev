/**
 * Opens an app path in a new browser tab. Use for routes that must not be
 * handled by the SPA in the current tab (e.g. Store).
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

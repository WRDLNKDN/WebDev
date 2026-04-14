/** Default shell after /chat handling when no safe return path is provided. */
export const DEFAULT_CHAT_REDIRECT_RETURN = '/feed';

/**
 * Resolves the pathname to use after /chat redirect (desktop: messenger overlay).
 * Rejects values that could act as open redirects or break the router.
 */
export function resolveChatRedirectReturnPath(raw: string | null): string {
  if (raw == null || raw === '') return DEFAULT_CHAT_REDIRECT_RETURN;
  let s = raw.trim();
  if (!s.startsWith('/') || s.startsWith('//'))
    return DEFAULT_CHAT_REDIRECT_RETURN;

  const q = s.indexOf('?');
  const h = s.indexOf('#');
  let end = s.length;
  if (q !== -1) end = Math.min(end, q);
  if (h !== -1) end = Math.min(end, h);
  s = s.slice(0, end);

  if (s.length === 0 || s.length > 256) return DEFAULT_CHAT_REDIRECT_RETURN;
  if (s.includes('..') || s.includes('\\')) return DEFAULT_CHAT_REDIRECT_RETURN;
  if (/[\s<>"`]/.test(s)) return DEFAULT_CHAT_REDIRECT_RETURN;
  if (s.includes(':')) return DEFAULT_CHAT_REDIRECT_RETURN;

  return s;
}

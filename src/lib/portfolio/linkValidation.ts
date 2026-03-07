/**
 * Portfolio link validation: URL format, supported type, and public accessibility.
 * Used when adding/editing portfolio items. No infinite retries; clear error messages.
 */

import {
  getLinkType,
  normalizeGoogleUrl,
  type PortfolioLinkType,
} from './linkUtils';

export type ValidationResult =
  | { ok: true; linkType: PortfolioLinkType; embedUrl?: string }
  | { ok: false; error: string };

const VALID_URL_ONLY = 'Enter a valid URL (https:// or http://).';
const DISALLOWED_URL =
  'This URL is not allowed for portfolio projects. Please use a professional/public project link.';
const NOT_PUBLIC =
  'This link is not publicly accessible. Update sharing settings or use a public link.';

const DISALLOWED_HOST_TLDS = ['.xxx', '.adult', '.sex', '.porn'];
const DISALLOWED_TOKENS = [
  'porn',
  'porno',
  'xxx',
  'xvideo',
  'xvideos',
  'xnxx',
  'xhamster',
  'redtube',
  'youporn',
  'pornhub',
  'sexcam',
  'sexcams',
  'camgirl',
  'camgirls',
] as const;

const tokenBoundaryRegex = new RegExp(
  `(^|[^a-z0-9])(${DISALLOWED_TOKENS.join('|')})([^a-z0-9]|$)`,
  'i',
);

export function getPortfolioUrlSafetyError(url: string): string {
  const raw = url.trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const hostAndPath = `${host}${parsed.pathname.toLowerCase()}`;
    if (DISALLOWED_HOST_TLDS.some((tld) => host.endsWith(tld))) {
      return DISALLOWED_URL;
    }
    if (tokenBoundaryRegex.test(hostAndPath)) {
      return DISALLOWED_URL;
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * Validate portfolio URL: format and optionally check public access.
 * Does not retry; single attempt for accessibility.
 */
export async function validatePortfolioUrl(
  url: string,
  options: { checkAccessible?: boolean } = {},
): Promise<ValidationResult> {
  const raw = url.trim();
  if (!raw) return { ok: false, error: VALID_URL_ONLY };

  if (!/^https?:\/\//i.test(raw)) return { ok: false, error: VALID_URL_ONLY };

  try {
    new URL(raw);
  } catch {
    return { ok: false, error: VALID_URL_ONLY };
  }

  const safetyError = getPortfolioUrlSafetyError(raw);
  if (safetyError) return { ok: false, error: safetyError };

  const linkType = getLinkType(raw);

  let embedUrl: string | undefined;
  if (
    linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides'
  ) {
    embedUrl = normalizeGoogleUrl(raw);
  }

  if (options.checkAccessible) {
    const accessible = await checkLinkAccessibleCors(raw);
    if (!accessible) {
      return { ok: false, error: NOT_PUBLIC };
    }
  }

  return {
    ok: true,
    linkType,
    ...(embedUrl && embedUrl !== raw ? { embedUrl } : {}),
  };
}

/**
 * Check if URL is publicly accessible. Tries CORS HEAD for real status; if CORS blocks, falls back to no-cors GET.
 * Single attempt each, no retry.
 */
export async function checkLinkAccessibleCors(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) return true;
    if (res.status === 403 || res.status === 401) return false;
    // 404, 500, etc. - treat as not accessible for "public link" purpose
    if (res.status >= 400) return false;
    return true;
  } catch {
    // CORS or network: try GET no-cors so we don't block user (we can't read body anyway)
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 8_000);
      await fetch(url, { method: 'GET', mode: 'no-cors', signal: c2.signal });
      clearTimeout(t2);
      return true;
    } catch (e2) {
      if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'test') {
        console.warn('[portfolio] Link not reachable', {
          url: url.slice(0, 80),
          error: e2,
        });
      }
      return false;
    }
  }
}

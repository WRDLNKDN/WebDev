/**
 * Server-side link preview: extract first URL from post body and fetch
 * Open Graph (or fallback meta) metadata for LinkedIn-style unfurled cards.
 */

const URL_REGEX = /https?:\/\/[^\s<>[\]()]+(?:\([^\s)]*\)|[^\s<>[\]()]*)?/i;

const FETCH_TIMEOUT_MS = 4000;
const MAX_BODY_BYTES = 200_000;

export type LinkPreviewOverrides = {
  title?: string;
  description?: string;
  image?: string;
};

export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  /** True when HTML/OG could not be fully read; title/siteName still show hostname. */
  degraded?: boolean;
  /** Author-provided fields; clients should prefer these over top-level OG fields when present. */
  overrides?: LinkPreviewOverrides;
};

function isPrivateOrLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) {
    return true;
  }
  const bare = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (bare.includes(':')) {
    if (bare === '::1') return true;
    if (bare.startsWith('fe80:')) return true;
    if (bare.startsWith('fc') || bare.startsWith('fd')) return true;
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(bare);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    const c = Number(ipv4[3]);
    const d = Number(ipv4[4]);
    if ([a, b, c, d].some((n) => n > 255)) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

/**
 * Trim, require http(s), strip hash, reject unsafe hosts (loopback, common private ranges).
 */
export function normalizeHttpUrl(
  raw: string,
): { href: string; hostname: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const hostname = url.hostname;
  if (isPrivateOrLoopbackHost(hostname)) return null;
  url.hash = '';
  return { href: url.href, hostname: hostname.toLowerCase() };
}

function buildDegradedPreview(norm: {
  href: string;
  hostname: string;
}): LinkPreview {
  return {
    url: norm.href,
    title: norm.hostname,
    siteName: norm.hostname,
    degraded: true,
  };
}

/**
 * Merge author overrides into a preview. Only keys present on `raw` are applied;
 * empty strings clear that override. Returns a copy without `overrides` when none remain.
 */
export function mergeLinkPreviewOverrides(
  preview: LinkPreview,
  raw: unknown,
): LinkPreview {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return preview;
  }
  const o = raw as Record<string, unknown>;
  const nextOverrides: LinkPreviewOverrides = { ...(preview.overrides ?? {}) };

  const applyStr = (
    key: 'title' | 'description' | 'image',
    maxLen: number,
    asUrl?: boolean,
  ) => {
    if (!Object.prototype.hasOwnProperty.call(o, key)) return;
    const v = o[key];
    if (typeof v !== 'string') return;
    const t = v.trim();
    if (!t) {
      delete nextOverrides[key];
      return;
    }
    if (asUrl) {
      try {
        const u = new URL(t);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
        nextOverrides[key] = u.href.slice(0, maxLen);
      } catch {
        return;
      }
    } else {
      nextOverrides[key] = t.slice(0, maxLen);
    }
  };

  applyStr('title', 300);
  applyStr('description', 500);
  applyStr('image', 2000, true);

  const remaining = Object.keys(nextOverrides).filter((k) =>
    Boolean(nextOverrides[k as keyof LinkPreviewOverrides]),
  );
  if (remaining.length === 0) {
    const rest = { ...preview };
    delete rest.overrides;
    return rest;
  }
  return { ...preview, overrides: nextOverrides };
}

/** Returns the first http(s) URL in text, or null. */
export function getFirstUrl(text: string): string | null {
  const m = text.match(URL_REGEX);
  return m ? m[0] : null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function extractMeta(
  html: string,
  ogKey: string,
  fallbackTag?: { name: string; attr: string },
): string | undefined {
  const ogPattern = new RegExp(
    `<meta[^>]+property=["'](?:og:${ogKey})["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  let m = html.match(ogPattern);
  if (m) return decodeHtmlEntities(m[1].trim());
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["'](?:og:${ogKey})["']`,
    'i',
  );
  m = html.match(alt);
  if (m) return decodeHtmlEntities(m[1].trim());
  if (fallbackTag) {
    const fallback = new RegExp(
      `<meta[^>]+name=["']${fallbackTag.name}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    m = html.match(fallback);
    if (m) return decodeHtmlEntities(m[1].trim());
    const fallbackAlt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${fallbackTag.name}["']`,
      'i',
    );
    m = html.match(fallbackAlt);
    if (m) return decodeHtmlEntities(m[1].trim());
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const og = extractMeta(html, 'title');
  if (og) return og;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch
    ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim())
    : undefined;
}

/** Resolve relative image URL against the page URL. */
function resolveUrl(
  baseUrl: string,
  href: string | undefined,
): string | undefined {
  if (!href || !href.trim()) return undefined;
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return undefined;
  }
}

/**
 * Fetch URL and parse Open Graph / meta tags.
 * Returns null only when the URL cannot be normalized (invalid/unsafe).
 * On fetch/parse failure returns a degraded preview (hostname as title).
 */
export async function fetchLinkPreview(
  rawUrl: string,
): Promise<LinkPreview | null> {
  const norm = normalizeHttpUrl(rawUrl);
  if (!norm) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(norm.href, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LinkPreview/1.0; +https://github.com/wrdlnkdn)',
      },
    });

    if (
      !res.ok ||
      !res.headers.get('content-type')?.toLowerCase().includes('text/html')
    ) {
      return buildDegradedPreview(norm);
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) return buildDegradedPreview(norm);

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const finalUrl = res.url;
    const base = finalUrl;

    const titleRaw =
      extractMeta(html, 'title') ?? extractTitle(html) ?? norm.hostname;
    const title = titleRaw.slice(0, 300);
    const description = extractMeta(html, 'description', {
      name: 'description',
      attr: 'content',
    });
    const imageRaw = extractMeta(html, 'image');
    const image = resolveUrl(base, imageRaw);
    const siteNameRaw = extractMeta(html, 'site_name');

    return {
      url: finalUrl,
      title,
      description: description?.slice(0, 400),
      image,
      siteName: (siteNameRaw ?? norm.hostname).slice(0, 100),
    };
  } catch {
    return buildDegradedPreview(norm);
  } finally {
    clearTimeout(timeout);
  }
}

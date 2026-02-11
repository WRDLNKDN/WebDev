/**
 * Server-side link preview: extract first URL from post body and fetch
 * Open Graph (or fallback meta) metadata for LinkedIn-style unfurled cards.
 */

const URL_REGEX = /https?:\/\/[^\s<>[\]()]+(?:\([^\s)]*\)|[^\s<>[\]()]*)?/i;

const FETCH_TIMEOUT_MS = 4000;
const MAX_BODY_BYTES = 200_000;

export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

function isSafeHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return false;
  }
  if (host.endsWith('.local') || host.endsWith('.localhost')) {
    return false;
  }
  return true;
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
 * Fetch URL and parse Open Graph / meta tags. Returns null on any error or unsafe URL.
 */
export async function fetchLinkPreview(
  rawUrl: string,
): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!isSafeHost(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.href, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LinkPreview/1.0; +https://github.com/wrdlnkdn)',
      },
    });
    clearTimeout(timeout);
    if (
      !res.ok ||
      !res.headers.get('content-type')?.toLowerCase().includes('text/html')
    ) {
      return null;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) return null;
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const finalUrl = res.url;
    const base = finalUrl;

    const title =
      extractMeta(html, 'title') ?? extractTitle(html) ?? url.hostname;
    const description = extractMeta(html, 'description', {
      name: 'description',
      attr: 'content',
    });
    const imageRaw = extractMeta(html, 'image');
    const image = resolveUrl(base, imageRaw);
    const siteName = extractMeta(html, 'site_name');

    return {
      url: finalUrl,
      title: title.slice(0, 300),
      description: description?.slice(0, 400),
      image,
      siteName: siteName?.slice(0, 100),
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Domain-based platform detection for social/profile links.
 * Maps URL hostnames to platform values used by PLATFORM_OPTIONS.
 * Returns 'Custom' for unrecognized domains.
 */

/** Platform values must match PLATFORM_OPTIONS in constants/platforms.ts */
export type DetectablePlatform =
  | 'LinkedIn'
  | 'GitHub'
  | 'GitLab'
  | 'Stack Overflow'
  | 'Dev.to'
  | 'Notion'
  | 'Behance'
  | 'Dribbble'
  | 'Figma'
  | 'X'
  | 'Facebook'
  | 'Instagram'
  | 'TikTok'
  | 'Reddit'
  | 'Discord'
  | 'Threads'
  | 'Mastodon'
  | 'YouTube'
  | 'Twitch'
  | 'Medium'
  | 'Substack'
  | 'Patreon'
  | 'Calendly'
  | 'Armor Games'
  | 'Epic Games Store'
  | 'Game Jolt'
  | 'itch.io'
  | 'Kongregate'
  | 'Newgrounds'
  | 'Nintendo eShop'
  | 'PlayStation Store'
  | 'Roblox'
  | 'Steam'
  | 'Unity Play'
  | 'Xbox / Microsoft Store'
  | 'Box'
  | 'Dropbox'
  | 'Google Drive'
  | 'Mega'
  | 'OneDrive'
  | 'Amazon Music'
  | 'Apple Music'
  | 'Bandcamp'
  | 'Pandora'
  | 'SoundCloud'
  | 'Spotify'
  | 'Tidal'
  | 'Custom';

/** Domain (hostname) -> platform value. Order matters for subdomain matches. */
const DOMAIN_TO_PLATFORM: [string | RegExp, DetectablePlatform][] = [
  // Professional
  ['linkedin.com', 'LinkedIn'],
  ['github.com', 'GitHub'],
  ['gitlab.com', 'GitLab'],
  ['stackoverflow.com', 'Stack Overflow'],
  ['stackexchange.com', 'Stack Overflow'],
  ['dev.to', 'Dev.to'],
  ['notion.so', 'Notion'],
  ['behance.net', 'Behance'],
  ['dribbble.com', 'Dribbble'],
  ['figma.com', 'Figma'],
  // Social
  ['twitter.com', 'X'],
  ['x.com', 'X'],
  ['facebook.com', 'Facebook'],
  ['fb.com', 'Facebook'],
  ['instagram.com', 'Instagram'],
  ['tiktok.com', 'TikTok'],
  ['reddit.com', 'Reddit'],
  ['discord.com', 'Discord'],
  ['threads.net', 'Threads'],
  [/mastodon\./, 'Mastodon'],
  // Content
  ['youtube.com', 'YouTube'],
  ['youtu.be', 'YouTube'],
  ['twitch.tv', 'Twitch'],
  ['medium.com', 'Medium'],
  ['substack.com', 'Substack'],
  ['patreon.com', 'Patreon'],
  ['calendly.com', 'Calendly'],
  // Music / audio distribution
  ['music.amazon.com', 'Amazon Music'],
  ['music.apple.com', 'Apple Music'],
  ['bandcamp.com', 'Bandcamp'],
  ['pandora.com', 'Pandora'],
  ['soundcloud.com', 'SoundCloud'],
  ['spotify.com', 'Spotify'],
  ['tidal.com', 'Tidal'],
  // Files / cloud storage
  ['box.com', 'Box'],
  ['dropbox.com', 'Dropbox'],
  ['drive.google.com', 'Google Drive'],
  ['docs.google.com', 'Google Drive'],
  ['mega.nz', 'Mega'],
  ['mega.io', 'Mega'],
  ['onedrive.live.com', 'OneDrive'],
  ['1drv.ms', 'OneDrive'],
  // Games
  ['armorgames.com', 'Armor Games'],
  ['store.epicgames.com', 'Epic Games Store'],
  ['gamejolt.com', 'Game Jolt'],
  ['itch.io', 'itch.io'],
  ['kongregate.com', 'Kongregate'],
  ['newgrounds.com', 'Newgrounds'],
  ['nintendo.com', 'Nintendo eShop'],
  ['store.playstation.com', 'PlayStation Store'],
  ['roblox.com', 'Roblox'],
  ['steampowered.com', 'Steam'],
  ['steamcommunity.com', 'Steam'],
  ['play.unity.com', 'Unity Play'],
  ['xbox.com', 'Xbox / Microsoft Store'],
  ['microsoft.com', 'Xbox / Microsoft Store'],
];

/**
 * Detects platform from a URL's hostname.
 * Returns 'Custom' if the domain is not recognized.
 */
export function detectPlatformFromUrl(url: string): DetectablePlatform {
  if (!url || typeof url !== 'string') return 'Custom';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    for (const [pattern, platform] of DOMAIN_TO_PLATFORM) {
      if (typeof pattern === 'string') {
        if (host === pattern || host.endsWith(`.${pattern}`)) return platform;
      } else {
        if (pattern.test(host)) return platform;
      }
    }
  } catch {
    // Invalid URL
  }
  return 'Custom';
}

/**
 * Extracts a short display label (handle/username) from a URL.
 * Examples: github.com/AprilLorDrake → AprilLorDrake, linkedin.com/in/john → john
 */
export function getShortLinkLabel(url: string): string {
  if (!url || typeof url !== 'string') return url || '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const path = parsed.pathname.replace(/\/+$/, ''); // trim trailing slash
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) return parsed.hostname;

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // linkedin.com/in/username → username
    if (host.includes('linkedin') && segments[0] === 'in' && segments[1])
      return segments[1];
    // stackexchange.com/users/123456/slug → slug (last meaningful part)
    if (host.includes('stackexchange') && segments[0] === 'users')
      return segments[segments.length - 1] || segments[1] || path;
    // youtube.com/@handle or /c/name or /channel/xxx
    if (host.includes('youtube') || host.includes('youtu.be')) {
      const at = segments.find((s) => s.startsWith('@'));
      if (at) return at; // @handle
      if (segments[0] === 'c' && segments[1]) return segments[1];
      if (segments[0] === 'channel' && segments[1]) return segments[1];
    }
    // medium.com/@username
    if (host.includes('medium') && segments[0]?.startsWith('@'))
      return segments[0];

    // Default: last path segment (username for most profiles)
    return segments[segments.length - 1] ?? path;
  } catch {
    return url;
  }
}

/**
 * Normalize URL for duplicate detection: lowercase, trim, strip trailing slash.
 * Used by Edit Links modal and profile update validation.
 */
const TRACKING_QUERY_PARAMS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  'si',
  'trk',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
]);

export function normalizeUrlForDedup(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    const protocol =
      parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? 'https:'
        : parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const port =
      parsed.port &&
      !(
        (protocol === 'https:' && parsed.port === '443') ||
        (protocol === 'http:' && parsed.port === '80')
      )
        ? `:${parsed.port}`
        : '';
    const pathname = parsed.pathname
      .replace(/\/{2,}/g, '/')
      .replace(/\/+$/, '');
    const normalizedParams = new URLSearchParams();

    [...parsed.searchParams.entries()]
      .filter(([key, value]) => {
        const normalizedKey = key.trim().toLowerCase();
        return value.trim() && !TRACKING_QUERY_PARAMS.has(normalizedKey);
      })
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
        normalizedParams.append(key.trim().toLowerCase(), value.trim());
      });

    const search = normalizedParams.toString();
    return `${protocol}//${hostname}${port}${pathname}${search ? `?${search}` : ''}`;
  } catch {
    const fallback = trimmed.toLowerCase().replace(/^www\./, '');
    return fallback.endsWith('/') && fallback.length > 1
      ? fallback.slice(0, -1)
      : fallback;
  }
}

export function findDuplicateNormalizedUrl(
  urls: readonly string[],
): string | null {
  const seen = new Set<string>();
  for (const value of urls) {
    const normalized = normalizeUrlForDedup(value);
    if (!normalized) continue;
    if (seen.has(normalized)) return normalized;
    seen.add(normalized);
  }
  return null;
}

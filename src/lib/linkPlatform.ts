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
  | 'Reddit'
  | 'Discord'
  | 'Threads'
  | 'Mastodon'
  | 'YouTube'
  | 'Twitch'
  | 'Medium'
  | 'Substack'
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

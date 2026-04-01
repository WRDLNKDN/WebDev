/**
 * Warm Vite lazy-route chunks before navigation (hover/focus/touch + idle for authed shell).
 * Mirrors paths in `app/routing/lazyPages.ts` / `AppRouteTree.tsx`.
 */

const prefetched = new Set<string>();

function once(key: string, load: () => Promise<unknown>): void {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  void load().catch(() => {
    prefetched.delete(key);
  });
}

// ---------------------------------------------------------------------------
// Route prefetch table
// Each entry: [key, pathPredicate, loader]
// `pathPredicate` is either a string prefix (startsWith) or a custom function.
// Order matters: more-specific prefixes must come before general ones.
// ---------------------------------------------------------------------------

type Loader = () => Promise<unknown>;
type Predicate = string | ((p: string) => boolean);

type RouteEntry = [key: string, predicate: Predicate, load: Loader];

const ROUTE_TABLE: RouteEntry[] = [
  ['admin-app', '/admin', () => import('../../pages/admin/core/AdminApp')],
  [
    'games',
    '/dashboard/games',
    () => import('../../pages/dashboard/GamesPage'),
  ],
  [
    'settings',
    '/dashboard/settings',
    () => import('../../pages/dashboard/SettingsLayout'),
  ],
  [
    'notifications',
    '/dashboard/notifications',
    () => import('../../pages/dashboard/NotificationsPage'),
  ],
  ['dashboard', '/dashboard', () => import('../../pages/dashboard/Dashboard')],
  ['chat-page', '/chat-full', () => import('../../pages/chat/ChatPage')],
  ['chat-redirect', '/chat', () => import('../../pages/chat/ChatRedirect')],
  ['feed', '/feed', () => import('../../pages/feed/Feed')],
  ['directory', '/directory', () => import('../../pages/community/Directory')],
  [
    'groups',
    (p) => p.startsWith('/groups') || p.startsWith('/forums'),
    () => import('../../pages/community/GroupsPage'),
  ],
  ['saved', '/saved', () => import('../../pages/community/SavedPage')],
  [
    'event-detail',
    '/events/',
    () => import('../../pages/community/EventDetailPage'),
  ],
  ['events', '/events', () => import('../../pages/community/EventsPage')],
  ['project', '/projects/', () => import('../../pages/profile/ProjectPage')],
  [
    'public-profile',
    '/p/',
    () => import('../../pages/profile/PublicProfilePage'),
  ],
  [
    'landing',
    (p) => p.startsWith('/profile/') || p.startsWith('/u/'),
    () => import('../../pages/profile/LandingPage'),
  ],
  [
    'home',
    (p) => p === '/' || p === '/home',
    () => import('../../pages/home/Home'),
  ],
  ['join', '/join', () => import('../../pages/auth/Join')],
  ['signin', '/signin', () => import('../../pages/auth/SignIn')],
  [
    'advertise',
    '/advertise',
    () => import('../../pages/marketing/AdvertisePage'),
  ],
  ['help', '/help', () => import('../../pages/misc/HelpPage')],
  ['guidelines', '/guidelines', () => import('../../pages/legal/Guidelines')],
  ['privacy', '/privacy', () => import('../../pages/legal/Privacy')],
  ['terms', '/terms', () => import('../../pages/legal/Terms')],
  ['about', '/about', () => import('../../pages/marketing/About')],
  ['community', '/community', () => import('../../pages/community/Community')],
  ['platform', '/platform', () => import('../../pages/marketing/Platform')],
  ['store', '/store', () => import('../../pages/marketing/Store')],
];

function matches(predicate: Predicate, path: string): boolean {
  return typeof predicate === 'string'
    ? path.startsWith(predicate)
    : predicate(path);
}

/** Strip trailing `/` without regex (avoids ReDoS false positives from `+` quantifiers). */
function stripTrailingSlashes(segment: string): string {
  let end = segment.length;
  while (end > 0 && segment.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return segment.slice(0, end);
}

/**
 * Resolve pathname for prefetch matching (strip query, hash, trailing slashes).
 * Exported for unit tests.
 */
export function normalizePathForPrefetch(path: string): string {
  const base = path.split('#')[0] ?? path;
  const q = base.indexOf('?');
  const withoutQuery = q >= 0 ? base.slice(0, q) : base;
  const trimmed = stripTrailingSlashes(withoutQuery);
  return trimmed.length === 0 ? '/' : trimmed;
}

/**
 * Prefetch the route module(s) most likely needed for an internal path.
 * Safe to call repeatedly; deduped per chunk key.
 */
export function prefetchChunksForPath(rawPath: string): void {
  const p = normalizePathForPrefetch(rawPath);
  for (const [key, predicate, load] of ROUTE_TABLE) {
    if (matches(predicate, p)) {
      once(key, load);
      return;
    }
  }
}

const AUTHED_IDLE_PATHS: readonly string[] = [
  '/dashboard',
  '/feed',
  '/directory',
  '/chat-full',
  '/groups',
  '/saved',
  '/dashboard/games',
  '/events',
];

/**
 * After auth, prefetch heavy authed destinations during idle time so first click is faster.
 */
export function prefetchAuthedAppShellDuringIdle(): void {
  const run = () => {
    for (const path of AUTHED_IDLE_PATHS) {
      prefetchChunksForPath(path);
    }
  };

  if (typeof window === 'undefined') return;

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => run(), { timeout: 12_000 });
  } else {
    globalThis.setTimeout(run, 2_000);
  }
}

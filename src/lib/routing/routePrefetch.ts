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

type PrefetchRule = {
  match: (p: string) => boolean;
  key: string;
  load: () => Promise<unknown>;
};

/** Order matters: first match wins (more specific prefixes before general ones). */
const PREFETCH_RULES: PrefetchRule[] = [
  {
    match: (p) => p.startsWith('/admin'),
    key: 'admin-app',
    load: () => import('../../pages/admin/core/AdminApp'),
  },
  {
    match: (p) => p.startsWith('/dashboard/games'),
    key: 'games',
    load: () => import('../../pages/dashboard/GamesPage'),
  },
  {
    match: (p) => p.startsWith('/dashboard/settings'),
    key: 'settings',
    load: () => import('../../pages/dashboard/SettingsLayout'),
  },
  {
    match: (p) => p.startsWith('/dashboard/notifications'),
    key: 'notifications',
    load: () => import('../../pages/dashboard/NotificationsPage'),
  },
  {
    match: (p) => p.startsWith('/dashboard'),
    key: 'dashboard',
    load: () => import('../../pages/dashboard/Dashboard'),
  },
  {
    match: (p) => p.startsWith('/chat-full'),
    key: 'chat-page',
    load: () => import('../../pages/chat/ChatPage'),
  },
  {
    match: (p) => p.startsWith('/chat'),
    key: 'chat-redirect',
    load: () => import('../../pages/chat/ChatRedirect'),
  },
  {
    match: (p) => p.startsWith('/feed'),
    key: 'feed',
    load: () => import('../../pages/feed/Feed'),
  },
  {
    match: (p) => p.startsWith('/directory'),
    key: 'directory',
    load: () => import('../../pages/community/Directory'),
  },
  {
    match: (p) => p.startsWith('/groups') || p.startsWith('/forums'),
    key: 'groups',
    load: () => import('../../pages/community/GroupsPage'),
  },
  {
    match: (p) => p.startsWith('/saved'),
    key: 'saved',
    load: () => import('../../pages/community/SavedPage'),
  },
  {
    match: (p) => p.startsWith('/events/'),
    key: 'event-detail',
    load: () => import('../../pages/community/EventDetailPage'),
  },
  {
    match: (p) => p.startsWith('/events'),
    key: 'events',
    load: () => import('../../pages/community/EventsPage'),
  },
  {
    match: (p) => p.startsWith('/projects/'),
    key: 'project',
    load: () => import('../../pages/profile/ProjectPage'),
  },
  {
    match: (p) => p.startsWith('/p/'),
    key: 'public-profile',
    load: () => import('../../pages/profile/PublicProfilePage'),
  },
  {
    match: (p) => p.startsWith('/profile/') || p.startsWith('/u/'),
    key: 'landing',
    load: () => import('../../pages/profile/LandingPage'),
  },
  {
    match: (p) => p === '/' || p === '/home',
    key: 'home',
    load: () => import('../../pages/home/Home'),
  },
  {
    match: (p) => p.startsWith('/join'),
    key: 'join',
    load: () => import('../../pages/auth/Join'),
  },
  {
    match: (p) => p.startsWith('/signin'),
    key: 'signin',
    load: () => import('../../pages/auth/SignIn'),
  },
  {
    match: (p) => p.startsWith('/advertise'),
    key: 'advertise',
    load: () => import('../../pages/marketing/AdvertisePage'),
  },
  {
    match: (p) => p.startsWith('/help'),
    key: 'help',
    load: () => import('../../pages/misc/HelpPage'),
  },
  {
    match: (p) => p.startsWith('/guidelines'),
    key: 'guidelines',
    load: () => import('../../pages/legal/Guidelines'),
  },
  {
    match: (p) => p.startsWith('/privacy'),
    key: 'privacy',
    load: () => import('../../pages/legal/Privacy'),
  },
  {
    match: (p) => p.startsWith('/terms'),
    key: 'terms',
    load: () => import('../../pages/legal/Terms'),
  },
  {
    match: (p) => p.startsWith('/about'),
    key: 'about',
    load: () => import('../../pages/marketing/About'),
  },
  {
    match: (p) => p.startsWith('/community'),
    key: 'community',
    load: () => import('../../pages/community/Community'),
  },
  {
    match: (p) => p.startsWith('/platform'),
    key: 'platform',
    load: () => import('../../pages/marketing/Platform'),
  },
  {
    match: (p) => p.startsWith('/store'),
    key: 'store',
    load: () => import('../../pages/marketing/Store'),
  },
];

/**
 * Resolve pathname for prefetch matching (strip query, hash, trailing slashes).
 * Exported for unit tests.
 */
export function normalizePathForPrefetch(path: string): string {
  const base = path.split('#')[0] ?? path;
  const q = base.indexOf('?');
  return (q >= 0 ? base.slice(0, q) : base).replace(/\/+$/, '') || '/';
}

/**
 * Prefetch the route module(s) most likely needed for an internal path.
 * Safe to call repeatedly; deduped per chunk key.
 */
export function prefetchChunksForPath(rawPath: string): void {
  const p = normalizePathForPrefetch(rawPath);
  for (const rule of PREFETCH_RULES) {
    if (rule.match(p)) {
      once(rule.key, rule.load);
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

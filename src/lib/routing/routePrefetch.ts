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

  if (p.startsWith('/admin')) {
    once('admin-app', () => import('../../pages/admin/core/AdminApp'));
    return;
  }

  if (p.startsWith('/dashboard/games')) {
    once('games', () => import('../../pages/dashboard/GamesPage'));
    return;
  }

  if (p.startsWith('/dashboard/settings')) {
    once('settings', () => import('../../pages/dashboard/SettingsLayout'));
    return;
  }

  if (p.startsWith('/dashboard/notifications')) {
    once(
      'notifications',
      () => import('../../pages/dashboard/NotificationsPage'),
    );
    return;
  }

  if (p.startsWith('/dashboard')) {
    once('dashboard', () => import('../../pages/dashboard/Dashboard'));
    return;
  }

  if (p.startsWith('/chat-full')) {
    once('chat-page', () => import('../../pages/chat/ChatPage'));
    return;
  }

  if (p.startsWith('/chat')) {
    once('chat-redirect', () => import('../../pages/chat/ChatRedirect'));
    return;
  }

  if (p.startsWith('/feed')) {
    once('feed', () => import('../../pages/feed/Feed'));
    return;
  }

  if (p.startsWith('/directory')) {
    once('directory', () => import('../../pages/community/Directory'));
    return;
  }

  if (p.startsWith('/groups') || p.startsWith('/forums')) {
    once('groups', () => import('../../pages/community/GroupsPage'));
    return;
  }

  if (p.startsWith('/saved')) {
    once('saved', () => import('../../pages/community/SavedPage'));
    return;
  }

  if (p.startsWith('/events/')) {
    once('event-detail', () => import('../../pages/community/EventDetailPage'));
    return;
  }

  if (p.startsWith('/events')) {
    once('events', () => import('../../pages/community/EventsPage'));
    return;
  }

  if (p.startsWith('/projects/')) {
    once('project', () => import('../../pages/profile/ProjectPage'));
    return;
  }

  if (p.startsWith('/p/')) {
    once(
      'public-profile',
      () => import('../../pages/profile/PublicProfilePage'),
    );
    return;
  }

  if (p.startsWith('/profile/') || p.startsWith('/u/')) {
    once('landing', () => import('../../pages/profile/LandingPage'));
    return;
  }

  if (p === '/' || p === '/home') {
    once('home', () => import('../../pages/home/Home'));
    return;
  }

  if (p.startsWith('/join')) {
    once('join', () => import('../../pages/auth/Join'));
    return;
  }

  if (p.startsWith('/signin')) {
    once('signin', () => import('../../pages/auth/SignIn'));
    return;
  }

  if (p.startsWith('/advertise')) {
    once('advertise', () => import('../../pages/marketing/AdvertisePage'));
    return;
  }

  if (p.startsWith('/help')) {
    once('help', () => import('../../pages/misc/HelpPage'));
    return;
  }

  if (p.startsWith('/guidelines')) {
    once('guidelines', () => import('../../pages/legal/Guidelines'));
    return;
  }

  if (p.startsWith('/privacy')) {
    once('privacy', () => import('../../pages/legal/Privacy'));
    return;
  }

  if (p.startsWith('/terms')) {
    once('terms', () => import('../../pages/legal/Terms'));
    return;
  }

  if (p.startsWith('/about')) {
    once('about', () => import('../../pages/marketing/About'));
    return;
  }

  if (p.startsWith('/community')) {
    once('community', () => import('../../pages/community/Community'));
    return;
  }

  if (p.startsWith('/platform')) {
    once('platform', () => import('../../pages/marketing/Platform'));
    return;
  }

  if (p.startsWith('/store')) {
    once('store', () => import('../../pages/marketing/Store'));
    return;
  }
}

/**
 * After auth, prefetch heavy authed destinations during idle time so first click is faster.
 */
export function prefetchAuthedAppShellDuringIdle(): void {
  const run = () => {
    prefetchChunksForPath('/dashboard');
    prefetchChunksForPath('/feed');
    prefetchChunksForPath('/directory');
    prefetchChunksForPath('/chat-full');
    prefetchChunksForPath('/groups');
    prefetchChunksForPath('/saved');
    prefetchChunksForPath('/dashboard/games');
    prefetchChunksForPath('/events');
  };

  if (typeof window === 'undefined') return;

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => run(), { timeout: 12_000 });
  } else {
    globalThis.setTimeout(run, 2_000);
  }
}

/**
 * navConfig.ts — Single source of truth for WRDLNKDN global navigation.
 *
 * All nav items, their routes, active-state matchers, and feature flag keys
 * are declared here. Navbar components consume this config — they do NOT
 * contain their own route logic.
 *
 * IA order is alphabetical within each group per the Global Nav Epic.
 */

export type NavItem = {
  /** Display label */
  label: string;
  /** Route path */
  to: string;
  /** Feature flag key — if undefined, always visible when authed */
  flagKey?: string;
  /** Returns true when this item should be marked active */
  isActive: (path: string) => boolean;
};

/**
 * Authenticated primary nav — shown in desktop bar and mobile drawer.
 * Order: Chat, Directory, Feed, Dashboard (Profile) — alphabetical.
 * Events is feature-flagged OFF for Beta; it slots in alphabetically when ON.
 */
export const AUTHED_PRIMARY_NAV: NavItem[] = [
  {
    label: 'Chat',
    to: '/chat',
    flagKey: 'chat',
    isActive: (p) =>
      p === '/chat' || p.startsWith('/chat/') || p.startsWith('/chat-full'),
  },
  {
    label: 'Directory',
    to: '/directory',
    flagKey: 'directory',
    isActive: (p) => p === '/directory' || p.startsWith('/directory/'),
  },
  {
    label: 'Events',
    to: '/events',
    flagKey: 'events',
    isActive: (p) => p === '/events' || p.startsWith('/events/'),
  },
  {
    label: 'Feed',
    to: '/feed',
    flagKey: 'feed',
    isActive: (p) => p === '/feed' || p.startsWith('/feed/'),
  },
  {
    label: 'Profile',
    to: '/dashboard',
    flagKey: 'dashboard',
    isActive: (p) => p === '/dashboard' || p.startsWith('/dashboard/'),
  },
];

/**
 * Public (guest) nav — shown when not authenticated.
 * Coming-soon mode hides all of these.
 */
export const GUEST_PRIMARY_NAV = {
  join: { label: 'Join', to: '/join' },
  signIn: { label: 'Sign in', to: '/signin' },
} as const;

/**
 * Routes where nav collapses to logo-only public chrome.
 * No hamburger, no auth controls.
 */
export const PUBLIC_ONLY_PATHS = ['/join'];

/**
 * Routes that bypass the Layout wrapper entirely (no nav).
 */
export const NO_NAV_PATHS = [
  '/auth/callback',
  '/signin',
  '/bumper',
  '/chat-popup',
];

/**
 * Returns true when the current path should force a public-only header
 * (no authenticated nav items even if session exists).
 */
export const isForcePublicPath = (path: string): boolean =>
  PUBLIC_ONLY_PATHS.some((p) => path.startsWith(p));

/**
 * Returns true for home routes.
 */
export const isHomePath = (path: string): boolean =>
  path === '/' || path === '/home';

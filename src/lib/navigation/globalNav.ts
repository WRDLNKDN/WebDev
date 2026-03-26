/**
 * Canonical global navigation (IA): authenticated primary surfaces and helpers.
 * Order is stable; feature flags remove items without placeholders or layout holes.
 *
 * @see Epic: Global Navigation — Feed, Directory, Chat, Profile, Events (flag), Admin (role).
 */

import { DASHBOARD_FLAG, EVENTS_FLAG, FEED_FLAG } from '../featureFlags/keys';

/** Flag keys used for primary authenticated nav (string literals match `useFeatureFlag`). */
export const GLOBAL_NAV_PRIMARY_FLAG = {
  feed: FEED_FLAG,
  directory: 'directory',
  chat: 'chat',
  profile: DASHBOARD_FLAG,
  events: EVENTS_FLAG,
} as const;

/**
 * Deterministic order for authenticated primary links in the top nav / drawer.
 * Implementations must render in this sequence only. `store` opens in a new tab.
 */
export const GLOBAL_NAV_AUTHENTICATED_PRIMARY_ORDER = [
  'feed',
  'directory',
  'chat',
  'profile',
  'events',
  'store',
] as const;

export type GlobalNavAuthenticatedPrimaryKey =
  (typeof GLOBAL_NAV_AUTHENTICATED_PRIMARY_ORDER)[number];

/** Active when Chat surface is current (full chat or redirect routes; not pop-up). */
export function isGlobalNavChatActive(pathname: string): boolean {
  if (pathname.startsWith('/chat-popup')) return false;
  return (
    pathname === '/chat' ||
    pathname.startsWith('/chat/') ||
    pathname === '/chat-full' ||
    pathname.startsWith('/chat-full/')
  );
}

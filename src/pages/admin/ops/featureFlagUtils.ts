/** Human-readable labels for feature flag keys. */
export const FLAG_LABELS: Record<string, string> = {
  feed: 'Feed',
  dashboard: 'Dashboard',
  events: 'Events',
  store: 'Store',
  directory: 'Directory',
  chat: 'Chat',
  groups: 'Groups',
  games: 'Games',
  settings_privacy_marketing_consent: 'Privacy Settings',
};

/** Hover descriptions shown for each toggle. */
const FLAG_DESCRIPTIONS: Record<string, string> = {
  feed: 'Controls access to the main Feed surface.',
  dashboard:
    'Controls access to Dashboard, notifications, and settings surfaces.',
  events: 'Controls visibility of Events pages and event discovery links.',
  store: 'Controls access to the Store section.',
  directory: 'Controls access to the member Directory.',
  chat: 'Controls chat UI, overlays, and chat entry points.',
  groups: 'Controls Groups navigation links and the /groups route.',
  games: 'Controls Games navigation links and the /games route.',
  settings_privacy_marketing_consent:
    'Controls the Privacy settings page for marketing email/push consent.',
};

export const humanizeFlagKey = (key: string): string =>
  key
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const describeFlag = (key: string): string =>
  FLAG_DESCRIPTIONS[key] ??
  `Controls the ${humanizeFlagKey(key)} feature throughout the site.`;

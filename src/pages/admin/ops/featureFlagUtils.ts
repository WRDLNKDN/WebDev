/** Human-readable labels for feature flag keys. */
export const FLAG_LABELS: Record<string, string> = {
  coming_soon: 'Coming Soon Mode',
  feed: 'Feed',
  dashboard: 'Dashboard',
  events: 'Events',
  store: 'Store',
  directory: 'Directory',
  chat: 'Chat',
  groups: 'Groups',
  games: 'Games',
  settings_privacy_marketing_consent: 'Privacy Settings',
  directory_connections_csv_export: 'Directory connections CSV export',
};

/** Hover descriptions shown for each toggle. */
const FLAG_DESCRIPTIONS: Record<string, string> = {
  coming_soon:
    'When on, home shows Coming soon and hides join/sign-in/chat chrome for this Supabase env. Honored when VITE_APP_ENV is production (or prod) or uat; local dev always shows the full site. Admin routes stay reachable.',
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
  directory_connections_csv_export:
    'When off, hides the Export CSV button for connections in the Directory.',
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

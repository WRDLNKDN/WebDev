import type { LinkCategory } from '../types/profile';

export const PLATFORM_OPTIONS = [
  // --- PROFESSIONAL / MAKER ---
  { label: 'LinkedIn', value: 'LinkedIn', category: 'Professional' },
  { label: 'GitHub', value: 'GitHub', category: 'Professional' },
  { label: 'GitLab', value: 'GitLab', category: 'Professional' },
  {
    label: 'Stack Overflow',
    value: 'Stack Overflow',
    category: 'Professional',
  },
  { label: 'Dev.to', value: 'Dev.to', category: 'Professional' }, // New
  { label: 'Notion', value: 'Notion', category: 'Professional' }, // New
  { label: 'Calendly', value: 'Calendly', category: 'Professional' },
  { label: 'Behance', value: 'Behance', category: 'Professional' }, // New
  { label: 'Dribbble', value: 'Dribbble', category: 'Professional' }, // New
  { label: 'Figma', value: 'Figma', category: 'Professional' }, // New
  { label: 'Vercel', value: 'Vercel', category: 'Professional' },

  // --- SOCIAL / COMMUNITY ---
  { label: 'X (Twitter)', value: 'X', category: 'Social' },
  { label: 'Facebook', value: 'Facebook', category: 'Social' },
  { label: 'Instagram', value: 'Instagram', category: 'Social' },
  { label: 'TikTok', value: 'TikTok', category: 'Social' },
  { label: 'Reddit', value: 'Reddit', category: 'Social' },
  { label: 'Discord', value: 'Discord', category: 'Social' },
  { label: 'Threads', value: 'Threads', category: 'Social' }, // New
  { label: 'Mastodon', value: 'Mastodon', category: 'Social' }, // New

  // --- CONTENT ---
  { label: 'YouTube', value: 'YouTube', category: 'Content' },
  { label: 'Twitch', value: 'Twitch', category: 'Content' },
  { label: 'Medium', value: 'Medium', category: 'Content' },
  { label: 'Substack', value: 'Substack', category: 'Content' },
  { label: 'Patreon', value: 'Patreon', category: 'Content' },

  // --- GAMES ---
  { label: 'Armor Games', value: 'Armor Games', category: 'Games' },
  { label: 'Epic Games Store', value: 'Epic Games Store', category: 'Games' },
  { label: 'Game Jolt', value: 'Game Jolt', category: 'Games' },
  {
    label: 'GitHub (Game Repo)',
    value: 'GitHub (Game Repo)',
    category: 'Games',
  },
  { label: 'itch.io', value: 'itch.io', category: 'Games' },
  { label: 'Kongregate', value: 'Kongregate', category: 'Games' },
  { label: 'Newgrounds', value: 'Newgrounds', category: 'Games' },
  { label: 'Nintendo eShop', value: 'Nintendo eShop', category: 'Games' },
  {
    label: 'PlayStation Store',
    value: 'PlayStation Store',
    category: 'Games',
  },
  { label: 'Roblox', value: 'Roblox', category: 'Games' },
  { label: 'Steam', value: 'Steam', category: 'Games' },
  { label: 'Unity Play', value: 'Unity Play', category: 'Games' },
  {
    label: 'Web Browser (Playable Web Game)',
    value: 'Web Browser (Playable Web Game)',
    category: 'Games',
  },
  {
    label: 'Xbox / Microsoft Store',
    value: 'Xbox / Microsoft Store',
    category: 'Games',
  },

  // --- FILES / CLOUD STORAGE ---
  { label: 'Box', value: 'Box', category: 'Files' },
  { label: 'Dropbox', value: 'Dropbox', category: 'Files' },
  { label: 'Google Drive', value: 'Google Drive', category: 'Files' },
  { label: 'Mega', value: 'Mega', category: 'Files' },
  { label: 'OneDrive', value: 'OneDrive', category: 'Files' },

  // --- MUSIC ---
  // Alphabetical by label. YouTube also appears under Content; first occurrence
  // wins in PLATFORM_TO_CATEGORY so URL inference stays Content unless category is stored.
  { label: 'Amazon Music', value: 'Amazon Music', category: 'Music' },
  { label: 'Apple Music', value: 'Apple Music', category: 'Music' },
  { label: 'Bandcamp', value: 'Bandcamp', category: 'Music' },
  { label: 'Pandora', value: 'Pandora', category: 'Music' },
  { label: 'SoundCloud', value: 'SoundCloud', category: 'Music' },
  { label: 'Spotify', value: 'Spotify', category: 'Music' },
  { label: 'Tidal', value: 'Tidal', category: 'Music' },
  { label: 'YouTube', value: 'YouTube', category: 'Music' },
] as const;

export const CATEGORY_ORDER: LinkCategory[] = [
  'Professional',
  'Social',
  'Content',
  'Games',
  'Files',
  'Music',
  'Custom',
];

/** Valid link categories for persistence/display. */
const VALID_LINK_CATEGORIES: LinkCategory[] = [
  'Professional',
  'Social',
  'Content',
  'Games',
  'Files',
  'Music',
  'Custom',
];

/** Map platform value (lowercase) → LinkCategory. Used when category is missing. */
const PLATFORM_TO_CATEGORY = new Map<string, LinkCategory>();
for (const p of PLATFORM_OPTIONS) {
  const key = p.value.trim().toLowerCase();
  if (!PLATFORM_TO_CATEGORY.has(key)) {
    PLATFORM_TO_CATEGORY.set(key, p.category);
  }
}

/**
 * Returns the canonical category for a platform. Use when stored category is
 * missing or invalid so we never default to wrong group (e.g. Discord → Social).
 */
export function getCategoryForPlatform(platform: string): LinkCategory {
  if (!platform || typeof platform !== 'string') return 'Custom';
  const key = platform.trim().toLowerCase();
  return PLATFORM_TO_CATEGORY.get(key) ?? 'Custom';
}

/** True if value is a valid stored category. */
export function isValidLinkCategory(value: unknown): value is LinkCategory {
  return (
    typeof value === 'string' &&
    VALID_LINK_CATEGORIES.includes(value as LinkCategory)
  );
}

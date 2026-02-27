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
] as const;

export const CATEGORY_ORDER: LinkCategory[] = [
  'Professional',
  'Social',
  'Content',
  'Custom',
];

/** Valid link categories for persistence/display. */
const VALID_LINK_CATEGORIES: LinkCategory[] = [
  'Professional',
  'Social',
  'Content',
  'Custom',
];

/** Map platform value (lowercase) → LinkCategory. Used when category is missing. */
const PLATFORM_TO_CATEGORY = new Map<string, LinkCategory>(
  PLATFORM_OPTIONS.map((p) => [p.value.toLowerCase(), p.category]),
);

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

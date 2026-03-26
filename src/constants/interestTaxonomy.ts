/**
 * Two-tier interest taxonomy for Profile interests.
 * Category (tier 1) → sub-interests (tier 2). "Other" allows custom entry.
 */

export const INTEREST_CATEGORIES = [
  'Creative',
  'Sports & Fitness',
  'Tech & Games',
  'Food & Drink',
  'Learning & Reading',
  'Outdoors & Nature',
  'Other',
] as const;

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];

/** Sub-interests per category. Other has no predefined list; user enters custom. */
export const INTEREST_OPTIONS_BY_CATEGORY: Record<
  InterestCategory,
  readonly string[]
> = {
  Creative: [
    'Music',
    'Art',
    'Design',
    'Writing',
    'Photography',
    'Crafting',
    'Film',
    'Theater',
  ],
  'Sports & Fitness': [
    'Yoga',
    'Running',
    'Cycling',
    'Hiking',
    'Swimming',
    'Strength training',
    'Team sports',
    'Climbing',
  ],
  'Tech & Games': [
    'Coding',
    'Gaming',
    'Chess',
    'Board games',
    'Open source',
    'Hardware',
  ],
  'Food & Drink': [
    'Coffee',
    'Cooking',
    'Baking',
    'Wine',
    'Cocktails',
    'Food culture',
  ],
  'Learning & Reading': [
    'Reading',
    'Podcasts',
    'Documentaries',
    'Languages',
    'History',
    'Science',
  ],
  'Outdoors & Nature': [
    'Gardening',
    'Birding',
    'Camping',
    'Travel',
    'Sustainability',
  ],
  Other: [], // Custom entry only
};

/** All taxonomy options as flat list with category for groupBy. */
export interface InterestOption {
  label: string;
  category: InterestCategory;
}

const flattenOptions = (): InterestOption[] => {
  const out: InterestOption[] = [];
  for (const cat of INTEREST_CATEGORIES) {
    const subs = INTEREST_OPTIONS_BY_CATEGORY[cat];
    for (const label of subs) {
      out.push({ label, category: cat });
    }
  }
  return out;
};

export const INTEREST_OPTIONS_FLAT: InterestOption[] = flattenOptions();

/** Display label for "Other" when used as category (custom value follows). */
export const INTEREST_OTHER_LABEL = 'Other';

/** Max interests a member can select (Dashboard, Edit Profile, Join). */
export const INTERESTS_MAX = 16;

/**
 * Curated suggestions on the Join profile step (search-first UI). Every label must exist in the taxonomy.
 */
export const JOIN_SUGGESTED_INTEREST_LABELS: readonly string[] = [
  'Music',
  'Design',
  'Gaming',
  'Cycling',
  'Podcasts',
  'Cooking',
  'Travel',
  'Photography',
];

/** Max length for custom "Other" interest text (e.g. Join flow). */
export const INTEREST_CUSTOM_OTHER_MAX_LENGTH = 40;

/**
 * Expands Directory interest filter values for API: category names become their
 * sub-interests; individual interest labels stay as-is. Used so "Tech & Games"
 * matches profiles with any interest under that category.
 */
export function expandInterestFilterValues(values: string[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    const trimmed = v.trim();
    if (!trimmed) continue;
    const subs = INTEREST_OPTIONS_BY_CATEGORY[trimmed as InterestCategory];
    if (subs && subs.length > 0) {
      out.push(...subs);
    } else {
      out.push(trimmed);
    }
  }
  return [...new Set(out)];
}

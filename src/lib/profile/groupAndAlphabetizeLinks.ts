/**
 * groupAndAlphabetizeLinks
 *
 * Pure utility for Issue #609.
 * Groups visible SocialLinks into display categories (Professional, Social,
 * Content, Games, Files, Music, Other) and sorts links alphabetically by title within each group.
 *
 * Used by:
 *   - ProfileLinksWidget (grouped render path — Profile + Dashboard Identity)
 *   - EditLinksDialog sortedLinks (CURRENT LINKS section)
 */

import type { SocialLink } from '../../types/profile';
import { getCategoryForPlatform } from '../../constants/platforms';
import { detectPlatformFromUrl } from '../utils/linkPlatform';
import { compareSocialLinksAlphabetically } from './socialLinksPresentation';

export type DisplayCategory =
  | 'Professional'
  | 'Social'
  | 'Content'
  | 'Games'
  | 'Files'
  | 'Music'
  | 'Other';

/** Canonical render order for category groups. */
export const DISPLAY_CATEGORY_ORDER: DisplayCategory[] = [
  'Professional',
  'Social',
  'Content',
  'Games',
  'Files',
  'Music',
  'Other',
];

export type GroupedLinks = Record<DisplayCategory, SocialLink[]>;

/**
 * Maps a SocialLink to the display category used in the render surfaces.
 * 'Custom' category links are inferred from their platform/URL.
 */
function resolveDisplayCategory(link: SocialLink): DisplayCategory {
  if (
    link.category === 'Professional' ||
    link.category === 'Social' ||
    link.category === 'Content' ||
    link.category === 'Games' ||
    link.category === 'Files' ||
    link.category === 'Music'
  ) {
    return link.category;
  }
  // Custom or unknown — infer from platform so we don't mis-group
  const platform =
    link.platform?.trim() || detectPlatformFromUrl(link.url) || '';
  const inferred = getCategoryForPlatform(platform);
  if (inferred === 'Professional') return 'Professional';
  if (inferred === 'Social') return 'Social';
  if (inferred === 'Content') return 'Content';
  if (inferred === 'Games') return 'Games';
  if (inferred === 'Files') return 'Files';
  if (inferred === 'Music') return 'Music';
  return 'Other';
}

/**
 * Groups visible SocialLinks by display category and sorts them
 * alphabetically by label (case-insensitive) within each group.
 *
 * - Invisible links (`isVisible === false`) are excluded.
 * - Empty category buckets are always present so callers can safely
 *   filter with `.filter(cat => result[cat].length > 0)`.
 */
export function groupAndAlphabetizeLinks(socials: SocialLink[]): GroupedLinks {
  const result: GroupedLinks = {
    Professional: [],
    Social: [],
    Content: [],
    Games: [],
    Files: [],
    Music: [],
    Other: [],
  };

  for (const link of socials) {
    if (link?.isVisible === false) continue;
    const category = resolveDisplayCategory(link);
    result[category].push(link);
  }

  // Sort each bucket alphabetically by link title (matches Profile / Edit Links)
  for (const category of DISPLAY_CATEGORY_ORDER) {
    result[category].sort((a, b) => compareSocialLinksAlphabetically(a, b));
  }

  return result;
}

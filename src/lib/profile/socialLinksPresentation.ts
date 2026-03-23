import {
  getCategoryForPlatform,
  isValidLinkCategory,
} from '../../constants/platforms';
import type { LinkCategory, SocialLink } from '../../types/profile';
import {
  detectPlatformFromUrl,
  getShortLinkLabel,
} from '../utils/linkPlatform';

export type DisplayLinkCategory =
  | 'Professional'
  | 'Content'
  | 'Social'
  | 'Games'
  | 'Files'
  | 'Music'
  | 'Other';

export type SocialLinkGroup = {
  category: DisplayLinkCategory;
  links: SocialLink[];
};

export const DISPLAY_LINK_CATEGORY_ORDER: DisplayLinkCategory[] = [
  'Professional',
  'Content',
  'Social',
  'Games',
  'Files',
  'Music',
  'Other',
];

const DISPLAY_CATEGORY_RANK = new Map(
  DISPLAY_LINK_CATEGORY_ORDER.map((category, index) => [category, index]),
);

export function getSocialLinkPlatform(link: SocialLink): string {
  return link.platform?.trim() || detectPlatformFromUrl(link.url) || 'Custom';
}

export function getSocialLinkTitle(link: SocialLink): string {
  const explicitLabel = link.label?.trim();
  if (explicitLabel) return explicitLabel;

  const platform = link.platform?.trim();
  if (platform) return platform;

  const shortLabel = getShortLinkLabel(link.url).trim();
  if (shortLabel) return shortLabel;

  return link.url.trim();
}

function getStoredLinkCategory(link: SocialLink): LinkCategory {
  if (isValidLinkCategory(link.category)) {
    return link.category;
  }

  return getCategoryForPlatform(getSocialLinkPlatform(link));
}

export function getDisplayLinkCategory(link: SocialLink): DisplayLinkCategory {
  const storedCategory = getStoredLinkCategory(link);

  if (storedCategory === 'Custom') return 'Other';

  if (
    storedCategory === 'Professional' ||
    storedCategory === 'Content' ||
    storedCategory === 'Social' ||
    storedCategory === 'Games' ||
    storedCategory === 'Files' ||
    storedCategory === 'Music'
  ) {
    return storedCategory;
  }

  return 'Other';
}

export function compareSocialLinksAlphabetically(
  a: SocialLink,
  b: SocialLink,
): number {
  const titleCompare = getSocialLinkTitle(a).localeCompare(
    getSocialLinkTitle(b),
    undefined,
    { sensitivity: 'base' },
  );
  if (titleCompare !== 0) return titleCompare;

  const platformCompare = getSocialLinkPlatform(a).localeCompare(
    getSocialLinkPlatform(b),
    undefined,
    { sensitivity: 'base' },
  );
  if (platformCompare !== 0) return platformCompare;

  const urlCompare = a.url.localeCompare(b.url, undefined, {
    sensitivity: 'base',
  });
  if (urlCompare !== 0) return urlCompare;

  return a.id.localeCompare(b.id);
}

export function sortSocialLinksForEdit(links: SocialLink[]): SocialLink[] {
  return [...links].sort((a, b) => {
    const categoryCompare =
      (DISPLAY_CATEGORY_RANK.get(getDisplayLinkCategory(a)) ?? 999) -
      (DISPLAY_CATEGORY_RANK.get(getDisplayLinkCategory(b)) ?? 999);

    if (categoryCompare !== 0) return categoryCompare;

    return compareSocialLinksAlphabetically(a, b);
  });
}

export function groupSocialLinksByCategory(
  socials: SocialLink[],
  options?: { visibleOnly?: boolean },
): SocialLinkGroup[] {
  const sourceLinks = options?.visibleOnly
    ? socials.filter((link) => link.isVisible)
    : socials;

  const grouped = new Map<DisplayLinkCategory, SocialLink[]>();

  for (const link of sourceLinks) {
    const category = getDisplayLinkCategory(link);
    const existing = grouped.get(category) ?? [];
    existing.push(link);
    grouped.set(category, existing);
  }

  return DISPLAY_LINK_CATEGORY_ORDER.map((category) => ({
    category,
    links: (grouped.get(category) ?? []).sort(compareSocialLinksAlphabetically),
  })).filter((group) => group.links.length > 0);
}

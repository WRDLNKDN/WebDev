import { describe, expect, it } from 'vitest';
import { ADD_TO_LIST_BUTTON_LABEL } from '../../components/profile/links/EditLinksDialog';
import { LINKS_COLLAPSIBLE_HEADER } from '../../components/profile/links/ProfileLinksWidget';
import {
  DISPLAY_CATEGORY_ORDER,
  groupAndAlphabetizeLinks,
} from '../../lib/profile/groupAndAlphabetizeLinks';
import { compareLinksByTitle } from '../../lib/profile/linkTitle';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import type { SocialLink } from '../../types/profile';
import {
  ALL_LINKS,
  PROFESSIONAL_LINKS,
  makeLink,
} from './profileLinksAndEditLinks.fixtures';

describe('Regression: existing exported constants', () => {
  it('ADD_TO_LIST_BUTTON_LABEL is unchanged', () => {
    expect(ADD_TO_LIST_BUTTON_LABEL).toBe('+ Add to List');
    expect((ADD_TO_LIST_BUTTON_LABEL.match(/\+/g) ?? []).length).toBe(1);
  });

  it('LINKS_COLLAPSIBLE_HEADER is unchanged', () => {
    expect(LINKS_COLLAPSIBLE_HEADER).toBe('LINKS');
  });
});

describe('Regression: hasVisibleSocialLinks', () => {
  it('returns true when at least one link has isVisible', () => {
    expect(hasVisibleSocialLinks([{ isVisible: true }])).toBe(true);
    expect(
      hasVisibleSocialLinks([{ isVisible: false }, { isVisible: true }]),
    ).toBe(true);
  });

  it('returns false when no links or none visible', () => {
    expect(hasVisibleSocialLinks([])).toBe(false);
    expect(hasVisibleSocialLinks([{ isVisible: false }])).toBe(false);
    expect(hasVisibleSocialLinks(null)).toBe(false);
    expect(hasVisibleSocialLinks(undefined)).toBe(false);
  });
});

describe('groupAndAlphabetizeLinks', () => {
  it('groups links by category in DISPLAY_CATEGORY_ORDER', () => {
    const result = groupAndAlphabetizeLinks(ALL_LINKS);
    const presentCategories = Object.keys(result).filter(
      (k) => result[k as keyof typeof result].length > 0,
    );
    const expectedOrder = DISPLAY_CATEGORY_ORDER.filter((c) =>
      presentCategories.includes(c),
    );
    expect(presentCategories).toEqual(expectedOrder);
  });

  it('sorts links alphabetically by label within each category', () => {
    const result = groupAndAlphabetizeLinks(ALL_LINKS);

    const profLabels = result.Professional.map((l) => l.label);
    expect(profLabels).toEqual(
      [...profLabels].sort((a, b) => (a ?? '').localeCompare(b ?? '')),
    );

    const socialLabels = result.Social.map((l) => l.label);
    expect(socialLabels).toEqual(
      [...socialLabels].sort((a, b) => (a ?? '').localeCompare(b ?? '')),
    );

    const contentLabels = result.Content.map((l) => l.label);
    expect(contentLabels).toEqual(
      [...contentLabels].sort((a, b) => (a ?? '').localeCompare(b ?? '')),
    );
  });

  it('alpha order is case-insensitive', () => {
    const links: SocialLink[] = [
      makeLink({
        id: 'z1',
        category: 'Social',
        platform: 'zoom',
        url: 'https://zoom.us',
        label: 'zoom',
      }),
      makeLink({
        id: 'z2',
        category: 'Social',
        platform: 'Bluesky',
        url: 'https://bsky.app',
        label: 'Bluesky',
      }),
      makeLink({
        id: 'z3',
        category: 'Social',
        platform: 'mastodon',
        url: 'https://mastodon.social',
        label: 'mastodon',
      }),
    ];
    const result = groupAndAlphabetizeLinks(links);
    const labels = result.Social.map((l) => l.label?.toLowerCase());
    expect(labels).toEqual(['bluesky', 'mastodon', 'zoom']);
  });

  it('omits categories that have no links', () => {
    const result = groupAndAlphabetizeLinks(PROFESSIONAL_LINKS);
    expect(result.Social.length).toBe(0);
    expect(result.Content.length).toBe(0);
    expect(result.Professional.length).toBe(3);
  });

  it('filters out invisible links before grouping', () => {
    const mixed: SocialLink[] = [
      makeLink({
        id: 'v1',
        category: 'Professional',
        platform: 'GitHub',
        url: 'https://github.com/a',
        isVisible: true,
      }),
      makeLink({
        id: 'v2',
        category: 'Professional',
        platform: 'LinkedIn',
        url: 'https://linkedin.com/in/a',
        isVisible: false,
      }),
    ];
    const result = groupAndAlphabetizeLinks(mixed);
    expect(result.Professional.length).toBe(1);
    expect(result.Professional[0].id).toBe('v1');
  });

  it('returns empty groups for an empty array', () => {
    const result = groupAndAlphabetizeLinks([]);
    DISPLAY_CATEGORY_ORDER.forEach((cat) => {
      expect(result[cat].length).toBe(0);
    });
  });

  it('handles links with missing label by falling back to platform', () => {
    const links: SocialLink[] = [
      makeLink({
        id: 'n1',
        category: 'Social',
        platform: 'TikTok',
        url: 'https://tiktok.com/@a',
        label: undefined,
      }),
      makeLink({
        id: 'n2',
        category: 'Social',
        platform: 'Facebook',
        url: 'https://facebook.com/a',
        label: undefined,
      }),
    ];
    const result = groupAndAlphabetizeLinks(links);
    const expected = [...links]
      .sort(compareLinksByTitle)
      .map((l) => l.platform);
    const platforms = result.Social.map((l) => l.platform);
    expect(platforms).toEqual(expected);
  });
});

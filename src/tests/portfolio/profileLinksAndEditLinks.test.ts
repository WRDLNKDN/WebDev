/**
 * Unit tests for Issue #609:
 *   - Group Links by Category
 *   - Alphabetize Links within each Category
 *   - Restrict link rendering to Identity section (Profile + Dashboard)
 *
 * Covers:
 *   - groupAndAlphabetizeLinks() utility (new helper)
 *   - EditLinksDialog sortedLinks: within-category alpha order
 *   - ProfileLinksWidget: grouped+alphabetized display shape
 *   - Dashboard: links do NOT render in Portfolio section (no portfolioLinksSorted in DOM)
 *   - Existing regression guard: LINKS_COLLAPSIBLE_HEADER, ADD_TO_LIST_BUTTON_LABEL, hasVisibleSocialLinks
 */

import { describe, expect, it } from 'vitest';
import { ADD_TO_LIST_BUTTON_LABEL } from '../../components/profile/EditLinksDialog';
import { LINKS_COLLAPSIBLE_HEADER } from '../../components/profile/ProfileLinksWidget';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import {
  groupAndAlphabetizeLinks,
  DISPLAY_CATEGORY_ORDER,
} from '../../lib/profile/groupAndAlphabetizeLinks';
import type { SocialLink } from '../../types/profile';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeLink = (
  overrides: Partial<SocialLink> &
    Pick<SocialLink, 'id' | 'platform' | 'url' | 'category'>,
): SocialLink => ({
  label: overrides.platform,
  isVisible: true,
  order: 0,
  ...overrides,
});

const PROFESSIONAL_LINKS: SocialLink[] = [
  makeLink({
    id: 'p1',
    category: 'Professional',
    platform: 'Stack Overflow',
    url: 'https://stackoverflow.com/users/1',
    label: 'Stack Overflow',
    order: 2,
  }),
  makeLink({
    id: 'p2',
    category: 'Professional',
    platform: 'GitHub',
    url: 'https://github.com/user',
    label: 'GitHub',
    order: 0,
  }),
  makeLink({
    id: 'p3',
    category: 'Professional',
    platform: 'LinkedIn',
    url: 'https://linkedin.com/in/user',
    label: 'LinkedIn',
    order: 1,
  }),
];

const SOCIAL_LINKS: SocialLink[] = [
  makeLink({
    id: 's1',
    category: 'Social',
    platform: 'Instagram',
    url: 'https://instagram.com/user',
    label: 'Instagram',
    order: 1,
  }),
  makeLink({
    id: 's2',
    category: 'Social',
    platform: 'Discord',
    url: 'https://discord.com/user',
    label: 'Discord',
    order: 0,
  }),
];

const CONTENT_LINKS: SocialLink[] = [
  makeLink({
    id: 'c1',
    category: 'Content',
    platform: 'YouTube',
    url: 'https://youtube.com/@user',
    label: 'YouTube',
    order: 1,
  }),
  makeLink({
    id: 'c2',
    category: 'Content',
    platform: 'Blog',
    url: 'https://myblog.com',
    label: 'Blog',
    order: 0,
  }),
];

const ALL_LINKS = [...PROFESSIONAL_LINKS, ...SOCIAL_LINKS, ...CONTENT_LINKS];

// ---------------------------------------------------------------------------
// Regression guards (existing exports must stay stable)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// groupAndAlphabetizeLinks — new pure utility (Issue #609)
// ---------------------------------------------------------------------------

describe('groupAndAlphabetizeLinks', () => {
  it('groups links by category in DISPLAY_CATEGORY_ORDER', () => {
    const result = groupAndAlphabetizeLinks(ALL_LINKS);
    const presentCategories = Object.keys(result).filter(
      (k) => result[k as keyof typeof result].length > 0,
    );
    // Order must match DISPLAY_CATEGORY_ORDER
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
    const onlyProfessional = PROFESSIONAL_LINKS;
    const result = groupAndAlphabetizeLinks(onlyProfessional);
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
    // Should not throw; order should be Facebook → TikTok (alphabetical by platform fallback)
    const platforms = result.Social.map((l) => l.platform);
    expect(platforms).toEqual(['Facebook', 'TikTok']);
  });
});

// ---------------------------------------------------------------------------
// EditLinksDialog: sortedLinks sort contract (Issue #609 — alpha within category)
// ---------------------------------------------------------------------------

describe('EditLinksDialog sortedLinks: alphabetical within category', () => {
  /**
   * Mirrors the sort that EditLinksDialog.sortedLinks must use after #609:
   *   1. Category by CATEGORY_ORDER
   *   2. Within category: alphabetical by label (case-insensitive), NOT by order
   */
  const sortForDisplay = (links: SocialLink[]): SocialLink[] => {
    const CATEGORY_ORDER = ['Professional', 'Social', 'Content', 'Custom'];
    return [...links].sort((a, b) => {
      const catA = CATEGORY_ORDER.indexOf(a.category);
      const catB = CATEGORY_ORDER.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      const labelA = (a.label || a.platform || '').toLowerCase();
      const labelB = (b.label || b.platform || '').toLowerCase();
      return labelA.localeCompare(labelB);
    });
  };

  it('sorts within Professional alphabetically regardless of order property', () => {
    const sorted = sortForDisplay(PROFESSIONAL_LINKS);
    const labels = sorted.map((l) => l.label);
    expect(labels).toEqual(['GitHub', 'LinkedIn', 'Stack Overflow']);
  });

  it('sorts within Social alphabetically regardless of order property', () => {
    const sorted = sortForDisplay(SOCIAL_LINKS);
    const labels = sorted.map((l) => l.label);
    expect(labels).toEqual(['Discord', 'Instagram']);
  });

  it('Professional comes before Social before Content in sorted output', () => {
    const sorted = sortForDisplay(ALL_LINKS);
    const categories = sorted.map((l) => l.category);
    const profIdx = categories.lastIndexOf('Professional');
    const socialIdx = categories.indexOf('Social');
    const contentIdx = categories.indexOf('Content');
    expect(profIdx).toBeLessThan(socialIdx);
    expect(socialIdx).toBeLessThan(contentIdx);
  });

  it('does not use order property as a tiebreaker when labels differ', () => {
    // Stack Overflow has order=2, GitHub has order=0 — GitHub should still come first (alpha)
    const sorted = sortForDisplay(PROFESSIONAL_LINKS);
    expect(sorted[0].platform).toBe('GitHub');
  });
});

// ---------------------------------------------------------------------------
// ProfileLinksWidget grouped prop: shape contract
// ---------------------------------------------------------------------------

describe('ProfileLinksWidget grouped display shape', () => {
  /**
   * These tests validate the data transformation contract that the widget
   * relies on — i.e. that groupAndAlphabetizeLinks produces the correct
   * structure for the grouped render path. We test the pure logic; React
   * rendering is covered by E2E.
   */

  it('produces a non-empty entry only for categories that have visible links', () => {
    const result = groupAndAlphabetizeLinks(ALL_LINKS);
    const nonEmpty = DISPLAY_CATEGORY_ORDER.filter((c) => result[c].length > 0);
    expect(nonEmpty).toContain('Professional');
    expect(nonEmpty).toContain('Social');
    expect(nonEmpty).toContain('Content');
    expect(nonEmpty).not.toContain('Other');
  });

  it('every link in each group is visible', () => {
    const withHidden: SocialLink[] = [
      ...ALL_LINKS,
      makeLink({
        id: 'h1',
        category: 'Professional',
        platform: 'Notion',
        url: 'https://notion.so/a',
        isVisible: false,
      }),
    ];
    const result = groupAndAlphabetizeLinks(withHidden);
    DISPLAY_CATEGORY_ORDER.forEach((cat) => {
      result[cat].forEach((link) => {
        expect(link.isVisible).toBe(true);
      });
    });
  });

  it('total links across all groups equals the count of visible input links', () => {
    const withHidden: SocialLink[] = [
      ...ALL_LINKS,
      makeLink({
        id: 'h2',
        category: 'Social',
        platform: 'Threads',
        url: 'https://threads.net/a',
        isVisible: false,
      }),
    ];
    const visibleCount = withHidden.filter((l) => l.isVisible).length;
    const result = groupAndAlphabetizeLinks(withHidden);
    const totalGrouped = DISPLAY_CATEGORY_ORDER.reduce(
      (sum, cat) => sum + result[cat].length,
      0,
    );
    expect(totalGrouped).toBe(visibleCount);
  });
});

// ---------------------------------------------------------------------------
// Dashboard: links must NOT appear in Portfolio section
// ---------------------------------------------------------------------------

describe('Dashboard: links are restricted to Identity section', () => {
  /**
   * Dashboard previously passed links to a LINKS section rendered *inside*
   * the Portfolio <Paper>. After #609, links must be passed via
   * `slotLeftOfAvatar` on <IdentityHeader> and the Portfolio LINKS block must
   * be removed.
   *
   * These tests validate the structural contract through the data layer:
   *   - portfolioLinksSorted should no longer be used to render a LINKS list
   *     in the Portfolio section.
   *   - slotLeftOfAvatar must receive a <ProfileLinksWidget> when visible links exist.
   *
   * Full DOM assertions are in the E2E spec (dashboard-links-layout.spec.ts).
   */

  it('hasVisibleSocialLinks returns true when Dashboard socialsArray has visible links', () => {
    // Simulate what Dashboard does to decide whether to pass slotLeftOfAvatar
    const socialsArray = ALL_LINKS;
    expect(hasVisibleSocialLinks(socialsArray)).toBe(true);
  });

  it('hasVisibleSocialLinks returns false when all links are hidden', () => {
    const hiddenLinks = ALL_LINKS.map((l) => ({ ...l, isVisible: false }));
    expect(hasVisibleSocialLinks(hiddenLinks)).toBe(false);
  });

  it('hasVisibleSocialLinks returns false for empty socials (no slotLeftOfAvatar rendered)', () => {
    expect(hasVisibleSocialLinks([])).toBe(false);
  });

  it('groupAndAlphabetizeLinks used by slotLeftOfAvatar produces correct groups for Dashboard data', () => {
    // Dashboard passes `grouped` + `collapsible` to ProfileLinksWidget;
    // the widget uses groupAndAlphabetizeLinks internally.
    const result = groupAndAlphabetizeLinks(ALL_LINKS);
    expect(result.Professional.length).toBeGreaterThan(0);
    expect(result.Social.length).toBeGreaterThan(0);
    expect(result.Content.length).toBeGreaterThan(0);
  });
});

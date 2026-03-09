import { describe, expect, it } from 'vitest';
import {
  groupAndAlphabetizeLinks,
  DISPLAY_CATEGORY_ORDER,
} from '../../lib/profile/groupAndAlphabetizeLinks';
import { compareLinksByTitle } from '../../lib/profile/linkTitle';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import type { SocialLink } from '../../types/profile';
import {
  ALL_LINKS,
  PROFESSIONAL_LINKS,
  SOCIAL_LINKS,
} from './profileLinksAndEditLinks.fixtures';

describe('EditLinksDialog sortedLinks: alphabetical within category', () => {
  const sortForDisplay = (links: SocialLink[]): SocialLink[] => {
    const CATEGORY_ORDER = [
      'Professional',
      'Social',
      'Content',
      'Games',
      'Custom',
    ];
    return [...links].sort((a, b) => {
      const catA = CATEGORY_ORDER.indexOf(a.category);
      const catB = CATEGORY_ORDER.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      return compareLinksByTitle(a, b);
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
    const sorted = sortForDisplay(PROFESSIONAL_LINKS);
    expect(sorted[0].platform).toBe('GitHub');
  });
});

describe('ProfileLinksWidget grouped display shape', () => {
  it('produces non-empty entries only for categories with visible links', () => {
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
      {
        id: 'h1',
        category: 'Professional',
        platform: 'Notion',
        url: 'https://notion.so/a',
        label: 'Notion',
        isVisible: false,
        order: 0,
      },
    ];

    const result = groupAndAlphabetizeLinks(withHidden);
    DISPLAY_CATEGORY_ORDER.forEach((cat) => {
      result[cat].forEach((link) => {
        expect(link.isVisible).toBe(true);
      });
    });
  });

  it('total links across groups equals count of visible input links', () => {
    const withHidden: SocialLink[] = [
      ...ALL_LINKS,
      {
        id: 'h2',
        category: 'Social',
        platform: 'Threads',
        url: 'https://threads.net/a',
        label: 'Threads',
        isVisible: false,
        order: 0,
      },
    ];
    const visibleCount = withHidden.filter((l) => l.isVisible).length;
    const result = groupAndAlphabetizeLinks(withHidden);
    const totalGrouped = DISPLAY_CATEGORY_ORDER.reduce(
      (sum, cat) => sum + result[cat].length,
      0,
    );
    expect(totalGrouped).toBe(visibleCount);
  });

  it('infers category for custom links and keeps alphabetical order in inferred group', () => {
    const customLinks: SocialLink[] = [
      {
        id: 'c1',
        category: 'Custom',
        platform: '',
        url: 'https://youtube.com/@zeta',
        label: 'ZetaTube',
        isVisible: true,
        order: 0,
      },
      {
        id: 'c2',
        category: 'Custom',
        platform: '',
        url: 'https://youtube.com/@alpha',
        label: 'AlphaTube',
        isVisible: true,
        order: 1,
      },
    ];

    const result = groupAndAlphabetizeLinks(customLinks);
    expect(result.Content.map((l) => l.label)).toEqual([
      'AlphaTube',
      'ZetaTube',
    ]);
    expect(result.Professional).toHaveLength(0);
    expect(result.Social).toHaveLength(0);
  });
});

describe('Dashboard: links are restricted to Identity section', () => {
  it('hasVisibleSocialLinks returns true when links exist', () => {
    expect(hasVisibleSocialLinks(ALL_LINKS)).toBe(true);
  });

  it('hasVisibleSocialLinks returns false when all links are hidden', () => {
    const hiddenLinks = ALL_LINKS.map((l) => ({ ...l, isVisible: false }));
    expect(hasVisibleSocialLinks(hiddenLinks)).toBe(false);
  });

  it('hasVisibleSocialLinks returns false for empty socials', () => {
    expect(hasVisibleSocialLinks([])).toBe(false);
  });

  it('groupAndAlphabetizeLinks produces expected groups for dashboard data', () => {
    const result = groupAndAlphabetizeLinks(ALL_LINKS);
    expect(result.Professional.length).toBeGreaterThan(0);
    expect(result.Social.length).toBeGreaterThan(0);
    expect(result.Content.length).toBeGreaterThan(0);
  });
});

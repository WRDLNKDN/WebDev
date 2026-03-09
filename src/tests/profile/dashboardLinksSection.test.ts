import { describe, expect, it } from 'vitest';
import { groupDashboardLinks } from '../../pages/dashboard/dashboardLinksSection';
import type { SocialLink } from '../../types/profile';

describe('groupDashboardLinks', () => {
  it('groups links by category and sorts labels alphabetically within each category', () => {
    const links: SocialLink[] = [
      {
        id: '2',
        category: 'Professional',
        platform: 'LinkedIn',
        url: 'https://linkedin.com/in/zeta',
        isVisible: true,
        order: 10,
      },
      {
        id: '1',
        category: 'Professional',
        platform: 'GitHub',
        url: 'https://github.com/alpha',
        isVisible: true,
        order: 0,
      },
      {
        id: '3',
        category: 'Custom',
        platform: '',
        url: 'https://example.com/custom-link',
        isVisible: true,
        order: 1,
      },
    ];

    const groups = groupDashboardLinks(links);

    expect(groups.map((group) => group.heading)).toEqual([
      'Professional',
      'Other',
    ]);
    expect(groups[0]?.links.map((link) => link.id)).toEqual(['1', '2']);
    expect(groups[1]?.links.map((link) => link.id)).toEqual(['3']);
  });
});

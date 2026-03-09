import type { SocialLink } from '../../types/profile';

export const makeLink = (
  overrides: Partial<SocialLink> &
    Pick<SocialLink, 'id' | 'platform' | 'url' | 'category'>,
): SocialLink => ({
  label: overrides.platform,
  isVisible: true,
  order: 0,
  ...overrides,
});

export const PROFESSIONAL_LINKS: SocialLink[] = [
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

export const SOCIAL_LINKS: SocialLink[] = [
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

export const CONTENT_LINKS: SocialLink[] = [
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

export const ALL_LINKS = [
  ...PROFESSIONAL_LINKS,
  ...SOCIAL_LINKS,
  ...CONTENT_LINKS,
];

export const FIXTURE_USER_ID = '00000000-0000-0000-0000-000000000001';

const STUB_LINKS_PROFESSIONAL = [
  {
    id: 'link-p1',
    category: 'Professional',
    platform: 'GitHub',
    url: 'https://github.com/testuser',
    label: 'GitHub',
    isVisible: true,
    order: 2,
  },
  {
    id: 'link-p2',
    category: 'Professional',
    platform: 'LinkedIn',
    url: 'https://linkedin.com/in/testuser',
    label: 'LinkedIn',
    isVisible: true,
    order: 0,
  },
  {
    id: 'link-p3',
    category: 'Professional',
    platform: 'Stack Overflow',
    url: 'https://stackoverflow.com/users/1/testuser',
    label: 'Stack Overflow',
    isVisible: true,
    order: 1,
  },
];

const STUB_LINKS_SOCIAL = [
  {
    id: 'link-s1',
    category: 'Social',
    platform: 'Instagram',
    url: 'https://instagram.com/testuser',
    label: 'Instagram',
    isVisible: true,
    order: 1,
  },
  {
    id: 'link-s2',
    category: 'Social',
    platform: 'Discord',
    url: 'https://discord.com/testuser',
    label: 'Discord',
    isVisible: true,
    order: 0,
  },
];

const STUB_LINKS_CONTENT = [
  {
    id: 'link-c1',
    category: 'Content',
    platform: 'YouTube',
    url: 'https://youtube.com/@testuser',
    label: 'YouTube',
    isVisible: true,
    order: 1,
  },
  {
    id: 'link-c2',
    category: 'Content',
    platform: 'Blog',
    url: 'https://myblog.com',
    label: 'Blog',
    isVisible: true,
    order: 0,
  },
];

const ALL_STUB_LINKS = [
  ...STUB_LINKS_PROFESSIONAL,
  ...STUB_LINKS_SOCIAL,
  ...STUB_LINKS_CONTENT,
];

const BASE_PROFILE = {
  id: FIXTURE_USER_ID,
  handle: 'test-user-with-links',
  display_name: 'Test User',
  status: 'approved',
  join_reason: ['networking'],
  participation_style: ['builder'],
  policy_version: '1.0',
  industry: 'Technology and Software',
  secondary_industry: null,
  tagline: 'Test tagline',
  additional_context: '',
  nerd_creds: { skills: ['Testing'] },
  resume_url: null,
  avatar: null,
};

export const FIXTURE_PROFILES: Record<string, object> = {
  'test-user-with-links': {
    ...BASE_PROFILE,
    handle: 'test-user-with-links',
    socials: ALL_STUB_LINKS,
  },
  'test-user-links-only': {
    ...BASE_PROFILE,
    handle: 'test-user-links-only',
    socials: ALL_STUB_LINKS,
    resume_url: null,
  },
};

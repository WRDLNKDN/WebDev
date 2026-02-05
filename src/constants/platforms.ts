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
  { label: 'Behance', value: 'Behance', category: 'Professional' }, // New
  { label: 'Dribbble', value: 'Dribbble', category: 'Professional' }, // New
  { label: 'Figma', value: 'Figma', category: 'Professional' }, // New

  // --- SOCIAL / COMMUNITY ---
  { label: 'X (Twitter)', value: 'X', category: 'Social' },
  { label: 'Facebook', value: 'Facebook', category: 'Social' },
  { label: 'Instagram', value: 'Instagram', category: 'Social' },
  { label: 'Reddit', value: 'Reddit', category: 'Social' },
  { label: 'Discord', value: 'Discord', category: 'Social' },
  { label: 'Threads', value: 'Threads', category: 'Social' }, // New
  { label: 'Mastodon', value: 'Mastodon', category: 'Social' }, // New

  // --- CONTENT ---
  { label: 'YouTube', value: 'YouTube', category: 'Content' },
  { label: 'Twitch', value: 'Twitch', category: 'Content' },
  { label: 'Medium', value: 'Medium', category: 'Content' },
  { label: 'Substack', value: 'Substack', category: 'Content' },

  // --- CUSTOM ---
  { label: 'Custom URL', value: 'Custom', category: 'Custom' },
] as const;

export const CATEGORY_ORDER: LinkCategory[] = [
  'Professional',
  'Social',
  'Content',
  'Custom',
];

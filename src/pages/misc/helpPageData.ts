export const CONTACT_EMAIL = 'info@wrdlnkdn.com';
export const PROFILE_BASE = 'https://wrdlnkdn.com/profile/';

export const HELP_TYPES = [
  'Account and sign-in',
  'Profile and settings',
  'Feed and posting',
  'Connections and messaging',
  'Directory and search',
  'Groups and events',
  'Bug report',
  'Safety, moderation, or policy',
  'Billing, donations, or merch',
  'Partnership or sponsorship',
  'Feature request',
  'Other',
] as const;

export type HelpType = (typeof HELP_TYPES)[number];

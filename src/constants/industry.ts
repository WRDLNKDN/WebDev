/**
 * Controlled industry list for Profile (Primary/Secondary) and Directory filters.
 * Single source of truth for structured industry selection.
 */
export const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Education',
  'Finance',
  'Marketing',
  'Design',
  'Engineering',
  'Consulting',
  'Media',
  'Nonprofit',
  'Retail',
  'Manufacturing',
  'Other',
] as const;

export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number];

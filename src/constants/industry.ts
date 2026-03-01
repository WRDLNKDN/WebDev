/**
 * @deprecated Use industryTaxonomy (INDUSTRY_PRIMARY_OPTIONS, getSecondaryOptionsForPrimary) instead.
 * Profile Edit and Directory use the canonical taxonomy in constants/industryTaxonomy.ts.
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

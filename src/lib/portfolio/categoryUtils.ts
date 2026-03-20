/**
 * Project categories are stored in portfolio_items.tech_stack.
 * We normalize user input to avoid blank/duplicate tags and cap count.
 */

export const MAX_PROJECT_CATEGORIES = 8;
export const PORTFOLIO_CATEGORY_OPTIONS = [
  'Awards',
  'Case Study',
  'Certificates & Licenses',
  'Community Contribution',
  'Design',
  'Education / Coursework',
  'Event / Speaking',
  'Presentation',
  'Product / Engineering',
  'Program / Project Management',
  'Research',
  'Video / Media',
  'Web App',
  'Writing',
] as const;
export const PORTFOLIO_OTHER_CATEGORY_OPTION = 'Other' as const;
export const MAX_CUSTOM_PROJECT_CATEGORY_LENGTH = 40;

const PORTFOLIO_CATEGORY_OPTION_SET = new Set<string>(
  PORTFOLIO_CATEGORY_OPTIONS,
);

const normalizeCategory = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

export function normalizeCustomProjectCategory(value: string): string {
  return normalizeCategory(value);
}

export function isPredefinedProjectCategory(value: string): boolean {
  return PORTFOLIO_CATEGORY_OPTION_SET.has(normalizeCategory(value));
}

export function getProjectCategorySelection(
  categories: string[] | null | undefined,
): {
  pickerValue:
    | (typeof PORTFOLIO_CATEGORY_OPTIONS)[number]
    | typeof PORTFOLIO_OTHER_CATEGORY_OPTION
    | null;
  customCategory: string;
} {
  const [primaryCategory = ''] = normalizeProjectCategories(categories, 1);
  if (!primaryCategory) {
    return { pickerValue: null, customCategory: '' };
  }
  if (isPredefinedProjectCategory(primaryCategory)) {
    return {
      pickerValue:
        primaryCategory as (typeof PORTFOLIO_CATEGORY_OPTIONS)[number],
      customCategory: '',
    };
  }
  return {
    pickerValue: PORTFOLIO_OTHER_CATEGORY_OPTION,
    customCategory: primaryCategory,
  };
}

export function getPrimaryProjectCategory(
  categories: string[] | null | undefined,
): string | null {
  const [primaryCategory] = normalizeProjectCategories(categories, 1);
  return primaryCategory ?? null;
}

export function getProjectDisplayCategories(
  categories: string[] | null | undefined,
): string[] {
  const primaryCategory = getPrimaryProjectCategory(categories);
  return primaryCategory ? [primaryCategory] : [];
}

export function parseProjectCategories(
  input: string,
  maxCategories: number = MAX_PROJECT_CATEGORIES,
): string[] {
  const seen = new Set<string>();
  const parsed: string[] = [];

  for (const raw of input.split(/[,\n]/g)) {
    const category = normalizeCategory(raw);
    if (!category) continue;
    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(category);
    if (parsed.length >= maxCategories) break;
  }

  return parsed;
}

export function formatProjectCategories(categories: string[] | null): string {
  if (!Array.isArray(categories)) return '';
  return categories
    .map((entry) => normalizeCategory(String(entry)))
    .filter(Boolean)
    .join(', ');
}

export function normalizeProjectCategories(
  categories: string[] | null | undefined,
  maxCategories: number = MAX_PROJECT_CATEGORIES,
): string[] {
  if (!Array.isArray(categories)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of categories) {
    const category = normalizeCategory(String(raw));
    if (!category) continue;
    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(category);
    if (normalized.length >= maxCategories) break;
  }

  return normalized;
}

/**
 * Project categories are stored in portfolio_items.tech_stack.
 * We normalize user input to avoid blank/duplicate tags and cap count.
 */

export const MAX_PROJECT_CATEGORIES = 8;

const normalizeCategory = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

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

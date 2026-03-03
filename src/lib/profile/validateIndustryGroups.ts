import type { IndustryGroup } from '../../types/profile';

export type ValidateIndustryGroupsResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Validates industry groups for Edit Profile: max 5 groups, max 8 sub-industries
 * per group, no duplicate industry across groups.
 */
export function validateIndustryGroups(
  industries: IndustryGroup[],
): ValidateIndustryGroupsResult {
  const filled = industries.filter((g) => g.industry?.trim());
  const seen = new Set<string>();
  for (const g of filled) {
    const key = g.industry.trim();
    if (seen.has(key)) {
      return {
        ok: false,
        message: 'Duplicate Industry is not allowed across groups.',
      };
    }
    seen.add(key);
  }
  if (filled.length > 5) {
    return { ok: false, message: 'Maximum 5 Industry groups allowed.' };
  }
  for (const g of filled) {
    if (g.sub_industries.length > 8) {
      return {
        ok: false,
        message: `Maximum 8 Sub-Industries per Industry. "${g.industry}" has ${g.sub_industries.length}.`,
      };
    }
  }
  return { ok: true };
}

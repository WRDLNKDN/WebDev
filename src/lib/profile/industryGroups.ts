import type { IndustryGroup } from '../../types/profile';

type LegacyIndustryProfile = {
  industry?: string | null;
  secondary_industry?: string | null;
  industries?: unknown;
};

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function normalizeIndustryGroups(
  profile: LegacyIndustryProfile | null | undefined,
): IndustryGroup[] {
  if (!profile) return [];

  const fromJson = Array.isArray(profile.industries)
    ? profile.industries
        .map((group): IndustryGroup | null => {
          if (!group || typeof group !== 'object') return null;
          const item = group as {
            industry?: unknown;
            sub_industries?: unknown;
          };
          const industry = isString(item.industry) ? item.industry.trim() : '';
          if (!industry) return null;
          const subIndustries = Array.isArray(item.sub_industries)
            ? item.sub_industries
                .filter(isString)
                .map((value) => value.trim())
                .filter(Boolean)
            : [];
          return { industry, sub_industries: subIndustries };
        })
        .filter((group): group is IndustryGroup => Boolean(group))
    : [];

  if (fromJson.length > 0) return fromJson;

  const legacyIndustry = isString(profile.industry)
    ? profile.industry.trim()
    : '';
  if (!legacyIndustry) return [];

  const legacySub = isString(profile.secondary_industry)
    ? [profile.secondary_industry.trim()]
    : [];

  return [{ industry: legacyIndustry, sub_industries: legacySub }];
}

export function getIndustryDisplayLabels(
  profile: LegacyIndustryProfile | null | undefined,
): string[] {
  const groups = normalizeIndustryGroups(profile);
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    const ordered = [group.industry, ...group.sub_industries];
    for (const label of ordered) {
      const trimmed = label.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      labels.push(trimmed);
    }
  }

  return labels;
}

const NICHE_VALUE_SPLIT_REGEX = /[\n,]+/;

export function parseNicheValues(value: string | null | undefined): string[] {
  if (!value) return [];

  const seen = new Set<string>();
  const parsed: string[] = [];

  for (const part of value.split(NICHE_VALUE_SPLIT_REGEX)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(trimmed);
  }

  return parsed;
}

export function serializeNicheValues(values: string[]): string {
  return parseNicheValues(values.join(', ')).join(', ');
}

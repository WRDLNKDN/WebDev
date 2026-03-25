/** Shared PostgREST-style query param parsing for Playwright route stubs. */

export function parsePostgrestEqFilter(
  url: URL,
  column: string,
): string | undefined {
  const raw = url.searchParams.get(column);
  if (!raw?.startsWith('eq.')) return undefined;
  return decodeURIComponent(raw.slice(3));
}

export function parsePostgrestInFilter(
  url: URL,
  column: string,
): string[] | undefined {
  const raw = url.searchParams.get(column);
  if (!raw?.startsWith('in.')) return undefined;
  const inner = raw.slice(3).replaceAll('(', '').replaceAll(')', '');
  if (!inner.trim()) return [];
  return inner.split(',').map((part) => decodeURIComponent(part.trim()));
}

/** Single `eq.` value or expanded `in.(...)` list for one column. */
export function postgrestEqOrInColumnValues(
  url: URL,
  column: string,
): string[] {
  const single = parsePostgrestEqFilter(url, column);
  if (single) return [single];
  return parsePostgrestInFilter(url, column) ?? [];
}

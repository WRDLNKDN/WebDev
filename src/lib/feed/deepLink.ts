/**
 * Determines whether we should load more pages when deep-linking to a post
 * that isn't in the current items yet.
 * Used by Feed and unit tests.
 */
export function shouldLoadMoreForDeepLink(
  items: { id: string }[],
  postParam: string | null,
  hasNextCursor: boolean,
  attempts: number,
  maxAttempts: number,
): boolean {
  if (!postParam || items.length === 0 || !hasNextCursor) return false;
  if (attempts >= maxAttempts) return false;
  const found = items.some((i) => i.id === postParam);
  return !found;
}

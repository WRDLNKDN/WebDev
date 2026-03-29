export function getFeedPostElementId(postId: string): string {
  return `post-${postId}`;
}

export function scrollToFeedPost(postId: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById(getFeedPostElementId(postId));
  if (!el) return false;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.tabIndex = -1;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  el.dataset.feedPostHighlighted = 'true';
  window.setTimeout(() => {
    if (el.dataset.feedPostHighlighted === 'true') {
      delete el.dataset.feedPostHighlighted;
    }
  }, 2200);

  return true;
}

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

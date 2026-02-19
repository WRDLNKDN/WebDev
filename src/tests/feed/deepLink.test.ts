import { describe, expect, it } from 'vitest';
import { shouldLoadMoreForDeepLink } from '../../lib/feed/deepLink';

describe('shouldLoadMoreForDeepLink', () => {
  const items = [{ id: 'post-1' }, { id: 'post-2' }];

  it('returns false when postParam is null', () => {
    expect(shouldLoadMoreForDeepLink(items, null, true, 0, 3)).toBe(false);
  });

  it('returns false when items is empty', () => {
    expect(shouldLoadMoreForDeepLink([], 'post-1', true, 0, 3)).toBe(false);
  });

  it('returns false when post is already in items', () => {
    expect(shouldLoadMoreForDeepLink(items, 'post-1', true, 0, 3)).toBe(false);
  });

  it('returns false when no next cursor', () => {
    expect(shouldLoadMoreForDeepLink(items, 'post-99', false, 0, 3)).toBe(
      false,
    );
  });

  it('returns false when max attempts reached', () => {
    expect(shouldLoadMoreForDeepLink(items, 'post-99', true, 3, 3)).toBe(false);
  });

  it('returns true when post not found and can load more', () => {
    expect(shouldLoadMoreForDeepLink(items, 'post-99', true, 0, 3)).toBe(true);
  });

  it('returns true when attempts below max', () => {
    expect(shouldLoadMoreForDeepLink(items, 'post-99', true, 1, 3)).toBe(true);
  });

  it('returns false when attempts at max', () => {
    expect(shouldLoadMoreForDeepLink(items, 'post-99', true, 2, 3)).toBe(true);
    expect(shouldLoadMoreForDeepLink(items, 'post-99', true, 3, 3)).toBe(false);
  });
});

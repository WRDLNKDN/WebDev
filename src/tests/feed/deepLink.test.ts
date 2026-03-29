/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getFeedPostElementId,
  scrollToFeedPost,
  shouldLoadMoreForDeepLink,
} from '../../lib/feed/deepLink';

describe('scrollToFeedPost', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('focuses the post and clears its highlight marker after the timeout', () => {
    const el = document.createElement('div');
    const scrollIntoView = vi.fn();
    const focus = vi.fn();

    el.id = getFeedPostElementId('post-1');
    Object.defineProperty(el, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
    });
    Object.defineProperty(el, 'focus', {
      value: focus,
      configurable: true,
    });
    document.body.appendChild(el);

    expect(scrollToFeedPost('post-1')).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(el.tabIndex).toBe(-1);
    expect(el.dataset.feedPostHighlighted).toBe('true');

    vi.advanceTimersByTime(2200);

    expect(el.dataset.feedPostHighlighted).toBeUndefined();
  });
});

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

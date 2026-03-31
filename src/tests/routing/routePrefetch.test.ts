import { describe, expect, it } from 'vitest';
import {
  normalizePathForPrefetch,
  prefetchChunksForPath,
} from '../../lib/routing/routePrefetch';

describe('normalizePathForPrefetch', () => {
  it('strips query, hash, and trailing slashes', () => {
    expect(normalizePathForPrefetch('/feed')).toBe('/feed');
    expect(normalizePathForPrefetch('/feed/')).toBe('/feed');
    expect(normalizePathForPrefetch('/dashboard?x=1')).toBe('/dashboard');
    expect(normalizePathForPrefetch('/path/#hash')).toBe('/path');
    expect(normalizePathForPrefetch('/')).toBe('/');
    expect(normalizePathForPrefetch('///')).toBe('/');
  });

  it('prefers /dashboard/games over /dashboard prefix logic via public API', () => {
    expect(normalizePathForPrefetch('/dashboard/games/phuzzle/abc')).toBe(
      '/dashboard/games/phuzzle/abc',
    );
  });
});

describe('prefetchChunksForPath', () => {
  it('does not throw for common paths', () => {
    expect(() => prefetchChunksForPath('/feed')).not.toThrow();
    expect(() => prefetchChunksForPath('/dashboard/games')).not.toThrow();
    expect(() => prefetchChunksForPath('/chat-full')).not.toThrow();
  });

  it('accepts paths with query strings', () => {
    expect(() => prefetchChunksForPath('/dashboard?tab=1')).not.toThrow();
  });
});

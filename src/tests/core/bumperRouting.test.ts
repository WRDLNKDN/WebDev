import { describe, expect, it } from 'vitest';
import { resolveBumperNextPath } from '../../lib/utils/bumperRouting';

describe('bumperRouting', () => {
  it('defaults to the feed when next is missing', () => {
    expect(resolveBumperNextPath(undefined)).toBe('/feed');
    expect(resolveBumperNextPath(null)).toBe('/feed');
  });

  it('keeps safe in-app destinations', () => {
    expect(resolveBumperNextPath('/feed')).toBe('/feed');
    expect(resolveBumperNextPath('/directory?sort=recent')).toBe(
      '/directory?sort=recent',
    );
  });

  it('falls back to the feed when next points back to the bumper', () => {
    expect(resolveBumperNextPath('/bumper')).toBe('/feed');
    expect(resolveBumperNextPath('/bumper?from=join&next=/feed')).toBe('/feed');
  });

  it('falls back to the feed for external or malformed targets', () => {
    expect(resolveBumperNextPath('https://example.com/elsewhere')).toBe(
      '/feed',
    );
    expect(resolveBumperNextPath('//example.com/elsewhere')).toBe('/feed');
    expect(resolveBumperNextPath('feed')).toBe('/feed');
  });
});

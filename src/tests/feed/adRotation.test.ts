import { describe, expect, it } from 'vitest';
import {
  hashStringToSeed,
  interleaveWithAds,
  seededShuffle,
} from '../../lib/feed/adRotation';

describe('feed ad rotation', () => {
  it('inserts ads every N posts and rotates through advertisers', () => {
    const posts = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const ads = ['a1', 'a2'];
    const display = interleaveWithAds(posts, ads, 3);

    expect(display).toEqual([
      { kind: 'post', item: 'p1' },
      { kind: 'post', item: 'p2' },
      { kind: 'ad', advertiser: 'a1' },
      { kind: 'post', item: 'p3' },
      { kind: 'post', item: 'p4' },
      { kind: 'post', item: 'p5' },
      { kind: 'ad', advertiser: 'a2' },
      { kind: 'post', item: 'p6' },
      { kind: 'post', item: 'p7' },
    ]);
  });

  it('produces deterministic shuffle for same seed', () => {
    const ads = ['a1', 'a2', 'a3', 'a4'];
    const seed = hashStringToSeed('member-123-session');

    const first = seededShuffle(ads, seed);
    const second = seededShuffle(ads, seed);

    expect(first).toEqual(second);
    expect(first).toHaveLength(ads.length);
    expect(new Set(first)).toEqual(new Set(ads));
  });

  it('produces different shuffle for different seeds', () => {
    const ads = ['a1', 'a2', 'a3', 'a4'];

    const one = seededShuffle(ads, hashStringToSeed('seed-one'));
    const two = seededShuffle(ads, hashStringToSeed('seed-two'));

    expect(one).not.toEqual(two);
  });

  it('short-circuits shuffle for empty/single pools', () => {
    expect(seededShuffle([], 123)).toEqual([]);
    expect(seededShuffle(['a1'], 123)).toEqual(['a1']);
  });
});

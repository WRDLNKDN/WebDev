import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER, PLATFORM_OPTIONS } from '../../constants/platforms';

const EXPECTED_MUSIC_PLATFORMS_ALPHA = [
  'Amazon Music',
  'Apple Music',
  'Bandcamp',
  'Pandora',
  'SoundCloud',
  'Spotify',
  'Tidal',
  'YouTube',
];

describe('Music link platforms', () => {
  it('includes Music in category order for Manage Links', () => {
    expect(CATEGORY_ORDER).toContain('Music');
    expect(CATEGORY_ORDER.indexOf('Music')).toBeLessThan(
      CATEGORY_ORDER.indexOf('Custom'),
    );
    expect(CATEGORY_ORDER.indexOf('Files')).toBeLessThan(
      CATEGORY_ORDER.indexOf('Music'),
    );
  });

  it('keeps Music platform options in alphabetical order', () => {
    const labels = PLATFORM_OPTIONS.filter(
      (option) => option.category === 'Music',
    ).map((option) => option.label);

    expect(labels).toEqual(EXPECTED_MUSIC_PLATFORMS_ALPHA);
  });

  it('Music category has eight platforms', () => {
    const music = PLATFORM_OPTIONS.filter((p) => p.category === 'Music');
    expect(music).toHaveLength(8);
  });
});

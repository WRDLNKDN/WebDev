import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER, PLATFORM_OPTIONS } from '../../constants/platforms';

const EXPECTED_GAMES_PLATFORMS_ALPHA = [
  'Armor Games',
  'Epic Games Store',
  'Game Jolt',
  'GitHub (Game Repo)',
  'itch.io',
  'Kongregate',
  'Newgrounds',
  'Nintendo eShop',
  'PlayStation Store',
  'Roblox',
  'Steam',
  'Unity Play',
  'Web Browser (Playable Web Game)',
  'Xbox / Microsoft Store',
];

describe('games link platforms', () => {
  it('includes Games in category order for Manage Links', () => {
    expect(CATEGORY_ORDER).toContain('Games');
  });

  it('keeps Games platform options in alphabetical order', () => {
    const gameLabels = PLATFORM_OPTIONS.filter(
      (option) => option.category === 'Games',
    ).map((option) => option.label);

    expect(gameLabels).toEqual(EXPECTED_GAMES_PLATFORMS_ALPHA);
  });

  it('Games category has 14 platforms so dialog can append Other last', () => {
    const gamesPlatforms = PLATFORM_OPTIONS.filter(
      (p) => p.category === 'Games',
    );
    expect(gamesPlatforms).toHaveLength(14);
    const sorted = [...gamesPlatforms].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );
    expect(sorted.map((p) => p.label)).toEqual(EXPECTED_GAMES_PLATFORMS_ALPHA);
  });
});

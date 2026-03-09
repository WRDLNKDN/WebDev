import { describe, expect, it } from 'vitest';
import { PLATFORM_OPTIONS } from '../../constants/platforms';

describe('games link platforms', () => {
  it('keeps Games platform options in alphabetical order', () => {
    const gameLabels = PLATFORM_OPTIONS.filter(
      (option) => option.category === 'Games',
    ).map((option) => option.label);

    expect(gameLabels).toEqual([
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
    ]);
  });
});

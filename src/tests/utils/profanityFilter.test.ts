import { describe, expect, it } from 'vitest';
import { containsProfanity } from '../../lib/utils/profanityFilter';

describe('containsProfanity', () => {
  it('flags profane custom category values', () => {
    expect(containsProfanity('shit')).toBe(true);
    expect(containsProfanity('Bastard Ops')).toBe(true);
  });

  it('allows clean custom category values', () => {
    expect(containsProfanity('Community Tooling')).toBe(false);
    expect(containsProfanity('')).toBe(false);
  });
});

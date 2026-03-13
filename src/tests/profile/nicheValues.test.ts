import { describe, expect, it } from 'vitest';
import {
  parseNicheValues,
  serializeNicheValues,
} from '../../lib/profile/nicheValues';

describe('nicheValues helpers', () => {
  it('splits comma-delimited niche values into distinct entries', () => {
    expect(
      parseNicheValues('Platform Governance, DevSecOps, platform governance'),
    ).toEqual(['Platform Governance', 'DevSecOps']);
  });

  it('accepts newline-delimited values and trims whitespace', () => {
    expect(parseNicheValues('AI Safety\n  Research Ops  \n')).toEqual([
      'AI Safety',
      'Research Ops',
    ]);
  });

  it('serializes distinct values into a stable comma-delimited string', () => {
    expect(
      serializeNicheValues(['AI Safety', 'Research Ops', 'AI Safety']),
    ).toBe('AI Safety, Research Ops');
  });
});

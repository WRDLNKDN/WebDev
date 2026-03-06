import { describe, expect, it } from 'vitest';
import {
  formatProjectCategories,
  parseProjectCategories,
} from '../../lib/portfolio/categoryUtils';

describe('portfolio category parsing', () => {
  it('parses comma/newline input and trims whitespace', () => {
    expect(parseProjectCategories(' DevOps,  UX Design \nCase Study ')).toEqual(
      ['DevOps', 'UX Design', 'Case Study'],
    );
  });

  it('deduplicates case-insensitively', () => {
    expect(
      parseProjectCategories('DevOps, devops, DEVOPS, Case Study, case study'),
    ).toEqual(['DevOps', 'Case Study']);
  });

  it('caps categories to configured maximum', () => {
    expect(parseProjectCategories('a,b,c,d,e,f,g,h,i,j', 3)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('formats stored categories for input display', () => {
    expect(formatProjectCategories(['DevOps', ' Case Study '])).toBe(
      'DevOps, Case Study',
    );
    expect(formatProjectCategories(null)).toBe('');
  });
});

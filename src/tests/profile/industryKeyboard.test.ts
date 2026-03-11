import { describe, expect, it } from 'vitest';
import {
  appendSubIndustrySelection,
  findMatchingSubIndustryOption,
} from '../../components/profile/editProfileDialog/industryKeyboard';

describe('industry keyboard helpers', () => {
  it('commits the best matching sub-industry for Enter', () => {
    expect(
      findMatchingSubIndustryOption(
        'web',
        ['Software Engineering', 'Web Development', 'Developer Relations'],
        [],
      ),
    ).toBe('Web Development');
  });

  it('skips already-selected sub-industries when matching', () => {
    expect(
      findMatchingSubIndustryOption(
        'web',
        ['Web Development', 'Developer Relations'],
        ['Web Development'],
      ),
    ).toBeNull();
  });

  it('appends a unique selection without exceeding the limit', () => {
    expect(
      appendSubIndustrySelection(
        ['Cloud and Infrastructure'],
        'Web Development',
      ),
    ).toEqual(['Cloud and Infrastructure', 'Web Development']);

    expect(
      appendSubIndustrySelection(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 'I'),
    ).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  });
});

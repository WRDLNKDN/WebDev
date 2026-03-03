import { describe, expect, it } from 'vitest';
import { validateIndustryGroups } from '../../lib/profile/validateIndustryGroups';

describe('validateIndustryGroups', () => {
  it('returns ok for empty list', () => {
    expect(validateIndustryGroups([])).toEqual({ ok: true });
  });

  it('returns ok for one group with industry and no sub-industries', () => {
    expect(
      validateIndustryGroups([
        { industry: 'Technology and Software', sub_industries: [] },
      ]),
    ).toEqual({ ok: true });
  });

  it('returns ok for one group with up to 8 sub-industries', () => {
    const sub = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    expect(
      validateIndustryGroups([
        { industry: 'Finance and Insurance', sub_industries: sub },
      ]),
    ).toEqual({ ok: true });
  });

  it('returns error when same industry appears in two groups', () => {
    const result = validateIndustryGroups([
      { industry: 'Technology and Software', sub_industries: [] },
      { industry: 'Technology and Software', sub_industries: ['PM'] },
    ]);
    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toContain(
      'Duplicate Industry',
    );
  });

  it('returns error when more than 5 groups', () => {
    const groups = Array.from({ length: 6 }, (_, i) => ({
      industry: `Industry ${i}`,
      sub_industries: [] as string[],
    }));
    const result = validateIndustryGroups(groups);
    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toContain('Maximum 5');
  });

  it('returns error when a group has more than 8 sub-industries', () => {
    const sub = Array.from({ length: 9 }, (_, i) => `Sub${i}`);
    const result = validateIndustryGroups([
      { industry: 'Healthcare and Life Sciences', sub_industries: sub },
    ]);
    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toContain('Maximum 8');
    expect((result as { message: string }).message).toContain('9');
  });

  it('ignores groups with empty industry', () => {
    expect(
      validateIndustryGroups([
        { industry: '', sub_industries: [] },
        { industry: '  ', sub_industries: [] },
      ]),
    ).toEqual({ ok: true });
  });
});

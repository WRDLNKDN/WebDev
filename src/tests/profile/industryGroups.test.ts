import { describe, expect, it } from 'vitest';
import {
  getIndustryDisplayLabels,
  normalizeIndustryGroups,
} from '../../lib/profile/industryGroups';

describe('normalizeIndustryGroups', () => {
  it('uses industries json groups when present', () => {
    const groups = normalizeIndustryGroups({
      industries: [
        {
          industry: 'Technology and Software',
          sub_industries: ['Product Management', 'AI/ML'],
        },
        {
          industry: 'Media and Entertainment',
          sub_industries: [],
        },
      ],
      industry: 'Legacy Industry',
      secondary_industry: 'Legacy Sub',
    });

    expect(groups).toEqual([
      {
        industry: 'Technology and Software',
        sub_industries: ['Product Management', 'AI/ML'],
      },
      {
        industry: 'Media and Entertainment',
        sub_industries: [],
      },
    ]);
  });

  it('falls back to legacy industry fields when groups are missing', () => {
    expect(
      normalizeIndustryGroups({
        industry: 'Finance and Insurance',
        secondary_industry: 'Risk and Compliance',
      }),
    ).toEqual([
      {
        industry: 'Finance and Insurance',
        sub_industries: ['Risk and Compliance'],
      },
    ]);
  });
});

describe('getIndustryDisplayLabels', () => {
  it('returns deterministic, de-duplicated labels in group order', () => {
    const labels = getIndustryDisplayLabels({
      industries: [
        {
          industry: 'Technology and Software',
          sub_industries: ['AI/ML', 'Product Management'],
        },
        {
          industry: 'Media and Entertainment',
          sub_industries: ['AI/ML', 'Broadcast'],
        },
      ],
    });

    expect(labels).toEqual([
      'Technology and Software',
      'AI/ML',
      'Product Management',
      'Media and Entertainment',
      'Broadcast',
    ]);
  });
});

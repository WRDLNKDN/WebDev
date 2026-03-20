import { describe, expect, it } from 'vitest';
import {
  formatProjectCategories,
  getProjectCategorySelection,
  isPredefinedProjectCategory,
  normalizeProjectCategories,
  normalizeCustomProjectCategory,
  parseProjectCategories,
  PORTFOLIO_OTHER_CATEGORY_OPTION,
} from '../../lib/portfolio/categoryUtils';

describe('portfolio category parsing', () => {
  it('parses comma/newline input and trims whitespace', () => {
    expect(
      parseProjectCategories(' Product / Engineering,  Design \nCase Study '),
    ).toEqual(['Product / Engineering', 'Design', 'Case Study']);
  });

  it('deduplicates case-insensitively', () => {
    expect(
      parseProjectCategories(
        'Product / Engineering, product / engineering, PRODUCT / ENGINEERING, Case Study, case study',
      ),
    ).toEqual(['Product / Engineering', 'Case Study']);
  });

  it('caps categories to configured maximum', () => {
    expect(parseProjectCategories('a,b,c,d,e,f,g,h,i,j', 3)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('formats stored categories for input display', () => {
    expect(
      formatProjectCategories(['Product / Engineering', ' Case Study ']),
    ).toBe('Product / Engineering, Case Study');
    expect(formatProjectCategories(null)).toBe('');
  });

  it('normalizes category arrays for multi-select persistence', () => {
    expect(
      normalizeProjectCategories([
        ' Product / Engineering ',
        'product / engineering',
        '',
        '  ',
        'Design',
      ]),
    ).toEqual(['Product / Engineering', 'Design']);
    expect(normalizeProjectCategories(null)).toEqual([]);
  });

  it('detects predefined taxonomy values exactly', () => {
    expect(isPredefinedProjectCategory('Web App')).toBe(true);
    expect(isPredefinedProjectCategory('web app')).toBe(false);
    expect(isPredefinedProjectCategory('Custom Category')).toBe(false);
  });

  it('derives picker state for predefined and custom categories', () => {
    expect(getProjectCategorySelection(['Web App'])).toEqual({
      pickerValue: 'Web App',
      customCategory: '',
    });
    expect(getProjectCategorySelection(['My Custom Category'])).toEqual({
      pickerValue: PORTFOLIO_OTHER_CATEGORY_OPTION,
      customCategory: 'My Custom Category',
    });
    expect(getProjectCategorySelection(null)).toEqual({
      pickerValue: null,
      customCategory: '',
    });
  });

  it('normalizes freeform custom categories without changing the label', () => {
    expect(normalizeCustomProjectCategory('  Community   Tooling  ')).toBe(
      'Community Tooling',
    );
  });
});

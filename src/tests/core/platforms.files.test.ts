import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER, PLATFORM_OPTIONS } from '../../constants/platforms';

const EXPECTED_FILES_PLATFORMS_ALPHA = [
  'Box',
  'Dropbox',
  'Google Drive',
  'Mega',
  'OneDrive',
];

describe('Files link platforms', () => {
  it('includes Files in category order for Manage Links', () => {
    expect(CATEGORY_ORDER).toContain('Files');
    expect(CATEGORY_ORDER.indexOf('Files')).toBeLessThan(
      CATEGORY_ORDER.indexOf('Custom'),
    );
  });

  it('keeps Files platform options in alphabetical order', () => {
    const fileLabels = PLATFORM_OPTIONS.filter(
      (option) => option.category === 'Files',
    ).map((option) => option.label);

    expect(fileLabels).toEqual(EXPECTED_FILES_PLATFORMS_ALPHA);
  });

  it('Files category has five platforms', () => {
    const filesPlatforms = PLATFORM_OPTIONS.filter(
      (p) => p.category === 'Files',
    );
    expect(filesPlatforms).toHaveLength(5);
  });
});

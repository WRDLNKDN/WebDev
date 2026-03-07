import { describe, expect, it } from 'vitest';
import {
  detectPlatformFromUrl,
  findDuplicateNormalizedUrl,
  normalizeUrlForDedup,
} from '../lib/utils/linkPlatform';

describe('detectPlatformFromUrl', () => {
  it('detects newly supported domains', () => {
    expect(detectPlatformFromUrl('https://www.tiktok.com/@member')).toBe(
      'TikTok',
    );
    expect(detectPlatformFromUrl('https://www.patreon.com/member')).toBe(
      'Patreon',
    );
    expect(detectPlatformFromUrl('https://calendly.com/member/intro')).toBe(
      'Calendly',
    );
  });

  it('returns Custom for unrecognized hosts', () => {
    expect(detectPlatformFromUrl('https://example.invalid/member')).toBe(
      'Custom',
    );
  });

  it('normalizes URLs for duplicate detection across common profile variants', () => {
    expect(
      normalizeUrlForDedup(
        'http://www.linkedin.com/in/AprilLorDrake/?trk=public_profile',
      ),
    ).toBe('https://linkedin.com/in/AprilLorDrake');
    expect(normalizeUrlForDedup('linkedin.com/in/AprilLorDrake')).toBe(
      'https://linkedin.com/in/AprilLorDrake',
    );
  });

  it('finds duplicates after normalization', () => {
    expect(
      findDuplicateNormalizedUrl([
        'https://www.linkedin.com/in/AprilLorDrake/',
        'linkedin.com/in/AprilLorDrake?trk=public_profile',
      ]),
    ).toBe('https://linkedin.com/in/AprilLorDrake');
  });

  it('does not flag distinct normalized URLs as duplicates', () => {
    expect(
      findDuplicateNormalizedUrl([
        'https://github.com/AprilLorDrake',
        'https://linkedin.com/in/AprilLorDrake',
      ]),
    ).toBeNull();
  });
});

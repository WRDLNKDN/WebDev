import { describe, expect, it } from 'vitest';
import { detectPlatformFromUrl } from '../lib/utils/linkPlatform';

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
});

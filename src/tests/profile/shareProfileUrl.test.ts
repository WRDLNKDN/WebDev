import { describe, expect, it } from 'vitest';
import { buildShareProfileUrl } from '../../lib/profile/shareProfileUrl';

describe('buildShareProfileUrl', () => {
  it('uses provided base origin (no hardcoded domain)', () => {
    expect(buildShareProfileUrl('abc123', 'https://uat.example.com')).toBe(
      'https://uat.example.com/p/abc123',
    );
    expect(buildShareProfileUrl('xyz', 'https://wrdlnkdn.com')).toBe(
      'https://wrdlnkdn.com/p/xyz',
    );
  });

  it('returns path-only when no origin (SSR/safe fallback)', () => {
    expect(buildShareProfileUrl('token99')).toBe('/p/token99');
  });

  it('never returns hardcoded prod domain when given UAT origin', () => {
    const url = buildShareProfileUrl('t', 'https://uat.wrdlnkdn.com');
    expect(url).toBe('https://uat.wrdlnkdn.com/p/t');
    expect(url).not.toContain('https://wrdlnkdn.com/');
  });
});

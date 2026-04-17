import { describe, expect, it } from 'vitest';
import {
  FOOTER_DONATE_URL,
  FOOTER_SECTIONS,
  FOOTER_SOCIAL_LINKS,
  SHOW_FOOTER_DONATE,
} from '../../components/layout/footerConfig';
import { buildPayQrCodeImageUrl, PAY_PATH } from '../../lib/marketing/payLink';

describe('footerConfig', () => {
  it('keeps footer sections limited to company and legal notices', () => {
    expect(FOOTER_SECTIONS.map((section) => section.title)).toEqual([
      'Company',
      'Legal Notices',
    ]);
  });

  it('does not include the legacy platform section or links', () => {
    const footerLabels = FOOTER_SECTIONS.flatMap((section) => [
      section.title,
      ...section.links.map((link) => link.label),
    ]);

    expect(footerLabels).not.toContain('Platform');
    expect(footerLabels).not.toContain('Feed');
    expect(footerLabels).not.toContain('Chat');
    expect(footerLabels).not.toContain('Notifications');
    expect(footerLabels).not.toContain('Directory');
  });

  it('keeps the donate call-to-action on /pay (edge redirect in production)', () => {
    expect(FOOTER_DONATE_URL).toBe(PAY_PATH);
  });

  it('shows the donate call-to-action only in development builds', () => {
    expect(SHOW_FOOTER_DONATE).toBe(true);
  });

  it('builds donate QR to encode an absolute /pay URL', () => {
    const qr = buildPayQrCodeImageUrl('https://wrdlnkdn.com/pay');
    expect(qr).toContain('create-qr-code');
    expect(qr).toContain(encodeURIComponent('https://wrdlnkdn.com/pay'));
  });

  it('keeps github as the rightmost social link', () => {
    expect(FOOTER_SOCIAL_LINKS.map((link) => link.label)).toEqual([
      'Instagram',
      'Facebook',
      'LinkedIn',
      'YouTube',
      'GitHub',
    ]);
  });

  it('keeps instagram and github pointed at the canonical WRDLNKDN profiles', () => {
    expect(
      FOOTER_SOCIAL_LINKS.find((link) => link.label === 'Instagram')?.href,
    ).toBe('https://www.instagram.com/wrdlnkdn/');
    expect(
      FOOTER_SOCIAL_LINKS.find((link) => link.label === 'GitHub')?.href,
    ).toBe('https://github.com/WRDLNKDN');
  });
});

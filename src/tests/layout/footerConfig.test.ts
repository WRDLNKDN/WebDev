import { describe, expect, it } from 'vitest';
import {
  FOOTER_DONATE_QR_ASSET,
  FOOTER_DONATE_URL,
  FOOTER_SECTIONS,
  FOOTER_SOCIAL_LINKS,
} from '../../components/layout/footerConfig';

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

  it('keeps the donate call-to-action pointed at the production payment URL', () => {
    expect(FOOTER_DONATE_URL).toBe(
      'https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f',
    );
  });

  it('points the donate modal QR image at a static app asset', () => {
    expect(FOOTER_DONATE_QR_ASSET).toBe('/assets/donate-qr.png');
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
});

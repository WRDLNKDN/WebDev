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
      'https://0ce9348c-39fb-4c78-88f3-cde23f784fad.paylinks.godaddy.com/d43df879-0ba0-4c34-9de0-878',
    );
  });

  it('points the donate modal QR image at a URL that encodes the donate link', () => {
    expect(FOOTER_DONATE_QR_ASSET).toContain('create-qr-code');
    expect(FOOTER_DONATE_QR_ASSET).toContain(
      encodeURIComponent(FOOTER_DONATE_URL),
    );
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

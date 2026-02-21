import { describe, expect, it } from 'vitest';
import {
  buildAdvertiserInsertPayload,
  buildAdvertiserUpdatePayload,
} from '../../lib/admin/advertiserPayload';

const sampleForm = {
  company_name: '  WRDLNKDN  ',
  title: '  Sponsor spotlight ',
  description: '  Great ad ',
  url: ' https://example.com ',
  image_url: ' https://cdn.example.com/ad.png ',
  links: [
    { label: ' Learn more ', url: ' https://example.com/learn ' },
    { label: ' ', url: ' ' },
  ],
  active: true,
  sort_order: 2,
};

describe('advertiser payload builders', () => {
  it('sets logo_url to null for inserts', () => {
    const payload = buildAdvertiserInsertPayload(sampleForm);
    expect(payload.logo_url).toBeNull();
    expect(payload.company_name).toBe('WRDLNKDN');
    expect(payload.links).toEqual([
      { label: 'Learn more', url: 'https://example.com/learn' },
    ]);
  });

  it('preserves existing logo_url for updates', () => {
    const payload = buildAdvertiserUpdatePayload(
      sampleForm,
      'https://cdn.example.com/logo.png',
    );
    expect(payload.logo_url).toBe('https://cdn.example.com/logo.png');
    expect(payload.image_url).toBe('https://cdn.example.com/ad.png');
  });
});

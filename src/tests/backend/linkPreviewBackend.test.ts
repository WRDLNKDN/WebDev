import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLinkPreview,
  mergeLinkPreviewOverrides,
  normalizeHttpUrl,
} from '../../../backend/linkPreview.ts';

describe('backend linkPreview', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('normalizeHttpUrl', () => {
    it('strips hash and returns lowercase hostname', () => {
      const n = normalizeHttpUrl('https://Example.com/path#frag');
      expect(n?.href).toBe('https://example.com/path');
      expect(n?.hostname).toBe('example.com');
    });

    it('returns null for non-http(s) and unsafe hosts', () => {
      expect(normalizeHttpUrl('ftp://example.com')).toBeNull();
      expect(normalizeHttpUrl('https://127.0.0.1/x')).toBeNull();
      expect(normalizeHttpUrl('https://192.168.0.1/')).toBeNull();
      expect(normalizeHttpUrl('not a url')).toBeNull();
    });
  });

  describe('mergeLinkPreviewOverrides', () => {
    it('applies overrides and drops empty strings', () => {
      const base = {
        url: 'https://a.com',
        title: 'OG',
        overrides: { title: 'Old' },
      };
      const merged = mergeLinkPreviewOverrides(base, {
        title: 'New title',
        description: '  ',
        image: 'https://img.example/p.png',
      });
      expect(merged.title).toBe('OG');
      expect(merged.overrides?.title).toBe('New title');
      expect(merged.overrides?.description).toBeUndefined();
      expect(merged.overrides?.image).toBe('https://img.example/p.png');
    });

    it('removes overrides key when all cleared', () => {
      const base = {
        url: 'https://a.com',
        overrides: { title: 'x' },
      };
      const merged = mergeLinkPreviewOverrides(base, { title: '' });
      expect(merged.overrides).toBeUndefined();
    });
  });

  describe('fetchLinkPreview', () => {
    it('returns degraded preview when response is not HTML', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Promise.resolve({
            ok: true,
            url: 'https://example.com/blob',
            headers: {
              get: (name: string) =>
                name.toLowerCase() === 'content-type'
                  ? 'application/octet-stream'
                  : null,
            },
            arrayBuffer: async () => new ArrayBuffer(0),
          } as Response),
        ),
      );

      const p = await fetchLinkPreview('https://example.com/blob');
      expect(p?.degraded).toBe(true);
      expect(p?.title).toBe('example.com');
      expect(p?.url).toContain('example.com');
    });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildEcwidInstantSiteUrl,
  buildEcwidEmbedScriptSrc,
  buildEcwidProductBrowserInit,
  DEFAULT_ECWID_EMBED_STORE_ID,
  getAlternateStorefrontUrl,
  getEcwidEmbedStoreId,
  getEcwidScriptId,
  getEcwidStoreDivId,
  getEcwidStoreId,
  getStoreExternalUrl,
  GODADDY_STOREFRONT_URL,
  resolveStoreExternalUrl,
} from '../../lib/marketing/storefront';

describe('storefront helpers', () => {
  it('normalizes the Ecwid store id from env-style input', () => {
    expect(getEcwidStoreId(' 12345678 ')).toBe('12345678');
    expect(getEcwidStoreId('')).toBeUndefined();
    expect(getEcwidStoreId('   ')).toBeUndefined();
    expect(getEcwidStoreId(undefined)).toBeUndefined();
  });

  it('builds stable DOM ids for the Ecwid embed', () => {
    expect(getEcwidScriptId('123')).toBe('ecwid-script-123');
    expect(getEcwidStoreDivId('123')).toBe('my-store-123');
  });

  it('builds the Ecwid instant site URL with the store prefix', () => {
    expect(buildEcwidInstantSiteUrl('123')).toBe(
      'https://store123.company.site/',
    );
  });

  it('uses default embed store id when env id is empty', () => {
    expect(getEcwidEmbedStoreId({ VITE_ECWID_STORE_ID: '' })).toBe(
      DEFAULT_ECWID_EMBED_STORE_ID,
    );
  });

  it('uses env Ecwid id for embed when set', () => {
    expect(getEcwidEmbedStoreId({ VITE_ECWID_STORE_ID: ' 888 ' })).toBe('888');
  });

  it('builds Ecwid script.js URL for code embed', () => {
    const src = buildEcwidEmbedScriptSrc('129462253');
    expect(src).toContain('129462253');
    expect(src).toContain('data_platform=code');
    expect(src).toContain('app.ecwid.com/script.js');
  });

  it('builds the deferred Ecwid product browser init payload', () => {
    expect(buildEcwidProductBrowserInit('my-store-123')).toEqual([
      {
        widgetType: 'ProductBrowser',
        id: 'my-store-123',
        arg: [
          'categoriesPerRow=3',
          'views=grid(20,3) list(60) table(60)',
          'categoryView=grid',
          'searchView=list',
          'id=my-store-123',
        ],
      },
    ]);
  });

  it('keeps the backup storefront URL available for rollback', () => {
    expect(GODADDY_STOREFRONT_URL).toBe('https://www.wrdlnkdn.com/store');
  });

  it('prefers Ecwid instant site when VITE_ECWID_STORE_ID is set (over VITE_STORE_URL)', () => {
    expect(
      getStoreExternalUrl({
        VITE_STORE_URL: ' https://shop.example/ ',
        VITE_ECWID_STORE_ID: '99',
      }),
    ).toBe('https://store99.company.site/');
  });

  it('uses VITE_STORE_URL when VITE_ECWID_STORE_ID is empty', () => {
    expect(
      getStoreExternalUrl({
        VITE_STORE_URL: ' https://shop.example/ ',
        VITE_ECWID_STORE_ID: '',
      }),
    ).toBe('https://shop.example/');
  });

  it('falls back to Ecwid instant site when VITE_STORE_URL is not set', () => {
    expect(getStoreExternalUrl({ VITE_ECWID_STORE_ID: '12345' })).toBe(
      'https://store12345.company.site/',
    );
  });

  it('falls back to the default Ecwid instant site when no storefront env is set', () => {
    expect(getStoreExternalUrl({})).toBe(
      `https://store${DEFAULT_ECWID_EMBED_STORE_ID}.company.site/`,
    );
  });

  it('exposes Ecwid instant site or VITE_STORE_URL by priority', () => {
    expect(getAlternateStorefrontUrl({})).toBe(
      `https://store${DEFAULT_ECWID_EMBED_STORE_ID}.company.site/`,
    );
    expect(
      getAlternateStorefrontUrl({ VITE_STORE_URL: 'https://shop.example/' }),
    ).toBe('https://shop.example/');
    expect(getAlternateStorefrontUrl({ VITE_ECWID_STORE_ID: '9' })).toBe(
      'https://store9.company.site/',
    );
  });
});

describe('resolveStoreExternalUrl', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns Ecwid Instant Site when VITE_ECWID_STORE_ID is set (no probe)', async () => {
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: 'https://legacy.example/',
        VITE_ECWID_STORE_ID: '129462253',
      }),
    ).resolves.toBe('https://store129462253.company.site/');
  });

  it('uses VITE_STORE_URL when HEAD returns ok', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: 'https://shop.example/',
        VITE_ECWID_STORE_ID: '',
      }),
    ).resolves.toBe('https://shop.example/');
  });

  it('falls back to Ecwid when VITE_STORE_URL is not reachable', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: 'https://dead.example/',
        VITE_ECWID_STORE_ID: '',
      }),
    ).resolves.toBe(
      `https://store${DEFAULT_ECWID_EMBED_STORE_ID}.company.site/`,
    );
  });

  it('uses GoDaddy when no env URLs and probe succeeds', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: '',
        VITE_ECWID_STORE_ID: '',
      }),
    ).resolves.toBe(GODADDY_STOREFRONT_URL);
  });

  it('falls back to Ecwid when GoDaddy is not reachable and no env', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: '',
        VITE_ECWID_STORE_ID: '',
      }),
    ).resolves.toBe(
      `https://store${DEFAULT_ECWID_EMBED_STORE_ID}.company.site/`,
    );
  });

  it('retries GET when HEAD is 405 (GoDaddy path)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 }) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: '',
        VITE_ECWID_STORE_ID: '',
      }),
    ).resolves.toBe(GODADDY_STOREFRONT_URL);
  });
});

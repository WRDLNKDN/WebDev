import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
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

  it('uses VITE_STORE_URL when set for external store link', () => {
    expect(
      getStoreExternalUrl({
        VITE_STORE_URL: ' https://shop.example/ ',
        VITE_ECWID_STORE_ID: '99',
      }),
    ).toBe('https://shop.example/');
  });

  it('falls back to GoDaddy when VITE_STORE_URL is not set', () => {
    expect(getStoreExternalUrl({ VITE_ECWID_STORE_ID: '12345' })).toBe(
      GODADDY_STOREFRONT_URL,
    );
  });

  it('falls back to GoDaddy when no storefront env is set', () => {
    expect(getStoreExternalUrl({})).toBe(GODADDY_STOREFRONT_URL);
  });

  it('exposes alternate URL only when VITE_STORE_URL is configured', () => {
    expect(getAlternateStorefrontUrl({})).toBeUndefined();
    expect(
      getAlternateStorefrontUrl({ VITE_STORE_URL: 'https://shop.example/' }),
    ).toBe('https://shop.example/');
    expect(
      getAlternateStorefrontUrl({ VITE_ECWID_STORE_ID: '9' }),
    ).toBeUndefined();
  });
});

describe('resolveStoreExternalUrl', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it('prefers GoDaddy when the probe returns ok', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: 'https://alt.example/',
        VITE_ECWID_STORE_ID: '1',
      }),
    ).resolves.toBe(GODADDY_STOREFRONT_URL);
  });

  it('uses alternate when probe returns not ok (e.g. storefront gone)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: '',
        VITE_ECWID_STORE_ID: '222',
      }),
    ).resolves.toBe(GODADDY_STOREFRONT_URL);
  });

  it('retries GET when HEAD is 405', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 }) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: '',
        VITE_ECWID_STORE_ID: '1',
      }),
    ).resolves.toBe(GODADDY_STOREFRONT_URL);
  });

  it('uses alternate URL when probe fails and env has Ecwid', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network')) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: '',
        VITE_ECWID_STORE_ID: '111',
      }),
    ).resolves.toBe(GODADDY_STOREFRONT_URL);
  });

  it('still returns GoDaddy when probe fails and no alternate is configured', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network')) as typeof fetch;
    await expect(
      resolveStoreExternalUrl({
        VITE_STORE_URL: '',
        VITE_ECWID_STORE_ID: '',
      }),
    ).resolves.toBe(GODADDY_STOREFRONT_URL);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildEcwidProductBrowserInit,
  getAlternateStorefrontUrl,
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

  it('builds the deferred Ecwid product browser init payload', () => {
    expect(buildEcwidProductBrowserInit('my-store-123')).toEqual([
      {
        widgetType: 'ProductBrowser',
        id: 'my-store-123',
        arg: ['id=my-store-123', 'views=grid(1,60)'],
      },
    ]);
  });

  it('keeps the backup storefront URL available for rollback', () => {
    expect(GODADDY_STOREFRONT_URL).toBe('https://wrdlnkdn.com/store-1');
  });

  it('uses VITE_STORE_URL when set for external store link', () => {
    expect(
      getStoreExternalUrl({
        VITE_STORE_URL: ' https://shop.example/ ',
        VITE_ECWID_STORE_ID: '99',
      }),
    ).toBe('https://shop.example/');
  });

  it('uses Ecwid instant-site style host from store id when URL unset', () => {
    expect(getStoreExternalUrl({ VITE_ECWID_STORE_ID: '12345' })).toBe(
      'https://12345.company.site',
    );
  });

  it('falls back to GoDaddy when no storefront env is set', () => {
    expect(getStoreExternalUrl({})).toBe(GODADDY_STOREFRONT_URL);
  });

  it('exposes alternate URL only when env configures Ecwid or VITE_STORE_URL', () => {
    expect(getAlternateStorefrontUrl({})).toBeUndefined();
    expect(
      getAlternateStorefrontUrl({ VITE_STORE_URL: 'https://shop.example/' }),
    ).toBe('https://shop.example/');
    expect(getAlternateStorefrontUrl({ VITE_ECWID_STORE_ID: '9' })).toBe(
      'https://9.company.site',
    );
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

  it('prefers GoDaddy when the probe fetch completes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({}) as typeof fetch;
    await expect(resolveStoreExternalUrl()).resolves.toBe(
      GODADDY_STOREFRONT_URL,
    );
  });

  it('uses alternate URL when probe fails and env has Ecwid', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network')) as typeof fetch;
    vi.stubEnv('VITE_ECWID_STORE_ID', '111');
    vi.stubEnv('VITE_STORE_URL', '');
    await expect(resolveStoreExternalUrl()).resolves.toBe(
      'https://111.company.site',
    );
    vi.unstubAllEnvs();
  });

  it('still returns GoDaddy when probe fails and no alternate is configured', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network')) as typeof fetch;
    vi.stubEnv('VITE_ECWID_STORE_ID', '');
    vi.stubEnv('VITE_STORE_URL', '');
    await expect(resolveStoreExternalUrl()).resolves.toBe(
      GODADDY_STOREFRONT_URL,
    );
    vi.unstubAllEnvs();
  });
});

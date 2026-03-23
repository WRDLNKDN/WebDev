import { describe, expect, it } from 'vitest';
import {
  buildEcwidProductBrowserInit,
  getEcwidScriptId,
  getEcwidStoreDivId,
  getEcwidStoreId,
  getStoreExternalUrl,
  GODADDY_STOREFRONT_URL,
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
});

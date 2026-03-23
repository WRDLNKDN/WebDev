export const GODADDY_STOREFRONT_URL = 'https://wrdlnkdn.com/store-1';

type StorefrontEnv = {
  VITE_STORE_URL?: string;
  VITE_ECWID_STORE_ID?: string;
};

/**
 * URL for the Store nav and /store redirect: Ecwid (or your canonical shop URL) in a new tab.
 * Set `VITE_STORE_URL` to your Ecwid Instant Site / custom storefront URL from the Ecwid dashboard.
 * If unset but `VITE_ECWID_STORE_ID` is set, uses a common Ecwid Instant Site hostname pattern;
 * override with `VITE_STORE_URL` if your shop URL differs. Last resort: legacy GoDaddy URL.
 */
export function getStoreExternalUrl(env?: StorefrontEnv): string {
  const viteStoreUrl = env?.VITE_STORE_URL ?? import.meta.env.VITE_STORE_URL;
  const viteEcwidId =
    env?.VITE_ECWID_STORE_ID ?? import.meta.env.VITE_ECWID_STORE_ID;

  const explicit = typeof viteStoreUrl === 'string' ? viteStoreUrl.trim() : '';
  if (explicit.length > 0) return explicit;

  const storeId = getEcwidStoreId(viteEcwidId);
  if (storeId) {
    return `https://${storeId}.company.site`;
  }

  return GODADDY_STOREFRONT_URL;
}

export function getEcwidStoreId(
  raw: string | null | undefined = import.meta.env.VITE_ECWID_STORE_ID,
): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getEcwidScriptId(storeId: string): string {
  return `ecwid-script-${storeId}`;
}

export function getEcwidStoreDivId(storeId: string): string {
  return `my-store-${storeId}`;
}

export function buildEcwidProductBrowserInit(storeDivId: string) {
  return [
    {
      widgetType: 'ProductBrowser',
      id: storeDivId,
      arg: [`id=${storeDivId}`, 'views=grid(1,60)'],
    },
  ];
}

export const GODADDY_STOREFRONT_URL = 'https://wrdlnkdn.com/store-1';

const GODADDY_STORE_PROBE_TIMEOUT_MS = 3500;

type StorefrontEnv = {
  VITE_STORE_URL?: string;
  VITE_ECWID_STORE_ID?: string;
};

/**
 * Ecwid / explicit shop URL when configured (no GoDaddy fallback).
 */
export function getAlternateStorefrontUrl(
  env?: StorefrontEnv,
): string | undefined {
  const viteStoreUrl = env?.VITE_STORE_URL ?? import.meta.env.VITE_STORE_URL;
  const viteEcwidId =
    env?.VITE_ECWID_STORE_ID ?? import.meta.env.VITE_ECWID_STORE_ID;

  const explicit = typeof viteStoreUrl === 'string' ? viteStoreUrl.trim() : '';
  if (explicit.length > 0) return explicit;

  const storeId = getEcwidStoreId(viteEcwidId);
  if (storeId) {
    return `https://${storeId}.company.site`;
  }

  return undefined;
}

/**
 * Sync URL for tests and first paint: alternate storefront when env is set, else GoDaddy.
 */
export function getStoreExternalUrl(env?: StorefrontEnv): string {
  return getAlternateStorefrontUrl(env) ?? GODADDY_STOREFRONT_URL;
}

/**
 * True when the legacy GoDaddy storefront responds (HEAD, opaque / no-cors).
 * Used to prefer wrdlnkdn.com/store-1 when the cart is still live; otherwise Ecwid / VITE_STORE_URL.
 */
export async function probeGodaddyStorefrontReachable(): Promise<boolean> {
  if (typeof fetch !== 'function') return false;

  const ctrl = new AbortController();
  const t = globalThis.setTimeout(() => {
    ctrl.abort();
  }, GODADDY_STORE_PROBE_TIMEOUT_MS);

  try {
    await fetch(GODADDY_STOREFRONT_URL, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: ctrl.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(t);
  }
}

/**
 * Navbar Store and /store: prefer GoDaddy when reachable; else Ecwid / VITE_STORE_URL; else GoDaddy.
 * Optional `env` matches `getAlternateStorefrontUrl` (useful in tests).
 */
export async function resolveStoreExternalUrl(
  env?: StorefrontEnv,
): Promise<string> {
  const alternate = getAlternateStorefrontUrl(env);
  const godaddyOk = await probeGodaddyStorefrontReachable();
  if (godaddyOk) return GODADDY_STOREFRONT_URL;
  if (alternate) return alternate;
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

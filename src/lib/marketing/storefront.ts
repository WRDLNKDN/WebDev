export const GODADDY_STOREFRONT_URL = 'https://www.wrdlnkdn.com/store';

/** Default Ecwid store ID for the in-app `/store` embed (override with `VITE_ECWID_STORE_ID`). */
export const DEFAULT_ECWID_EMBED_STORE_ID = '129462253';

const GODADDY_STORE_PROBE_TIMEOUT_MS = 3500;

type StorefrontEnv = {
  VITE_STORE_URL?: string;
  VITE_ECWID_STORE_ID?: string;
};

export function buildEcwidInstantSiteUrl(storeId: string): string {
  return `https://store${encodeURIComponent(storeId)}.company.site/`;
}

/**
 * Ecwid / explicit shop URL when configured (no GoDaddy fallback).
 */
export function getAlternateStorefrontUrl(env?: StorefrontEnv): string {
  const viteStoreUrl = env?.VITE_STORE_URL ?? import.meta.env.VITE_STORE_URL;
  const viteEcwidId =
    env?.VITE_ECWID_STORE_ID ?? import.meta.env.VITE_ECWID_STORE_ID;

  const explicit = typeof viteStoreUrl === 'string' ? viteStoreUrl.trim() : '';
  if (explicit.length > 0) return explicit;

  const storeId = getEcwidStoreId(viteEcwidId) ?? DEFAULT_ECWID_EMBED_STORE_ID;
  return buildEcwidInstantSiteUrl(storeId);
}

/**
 * Sync URL for first paint: configured storefront when present, else Ecwid instant site.
 */
export function getStoreExternalUrl(env?: StorefrontEnv): string {
  return getAlternateStorefrontUrl(env);
}

/**
 * True when the legacy GoDaddy storefront returns a successful HTTP response.
 * Uses CORS-capable fetch so we inspect `response.ok` (unlike `no-cors`, which always looked “up”).
 * Same-origin on wrdlnkdn.com: reliable. Cross-origin (e.g. local/UAT): may fail CORS → false → Ecwid.
 */
export async function probeGodaddyStorefrontReachable(): Promise<boolean> {
  if (typeof fetch !== 'function') return false;

  const ctrl = new AbortController();
  const t = globalThis.setTimeout(() => {
    ctrl.abort();
  }, GODADDY_STORE_PROBE_TIMEOUT_MS);

  try {
    let res = await fetch(GODADDY_STOREFRONT_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: ctrl.signal,
      credentials: 'omit',
      redirect: 'follow',
    });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 501) {
      res = await fetch(GODADDY_STOREFRONT_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: ctrl.signal,
        credentials: 'omit',
        redirect: 'follow',
      });
      return res.ok;
    }
    return false;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(t);
  }
}

/**
 * Legacy helper for external storefront URL resolution (e.g. probes). Navbar Store
 * uses `getStoreExternalUrl()` + `openExternalUrlInNewTab` (full storefront tab).
 * Optional `env` matches `getAlternateStorefrontUrl` (useful in tests).
 */
export async function resolveStoreExternalUrl(
  env?: StorefrontEnv,
): Promise<string> {
  const alternate = getAlternateStorefrontUrl(env);
  if (alternate) return alternate;
  const godaddyOk = await probeGodaddyStorefrontReachable();
  if (godaddyOk) return GODADDY_STOREFRONT_URL;
  return GODADDY_STOREFRONT_URL;
}

export function getEcwidStoreId(
  raw: string | null | undefined = import.meta.env.VITE_ECWID_STORE_ID,
): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Store ID for the embedded shop at `/store` (env wins, else production default). */
export function getEcwidEmbedStoreId(env?: StorefrontEnv): string {
  return (
    getEcwidStoreId(
      env?.VITE_ECWID_STORE_ID ?? import.meta.env.VITE_ECWID_STORE_ID,
    ) ?? DEFAULT_ECWID_EMBED_STORE_ID
  );
}

/** Ecwid `script.js` URL for code platform embeds. */
export function buildEcwidEmbedScriptSrc(
  storeId: string,
  dataDate = '2026-03-25',
): string {
  return `https://app.ecwid.com/script.js?${encodeURIComponent(storeId)}&data_platform=code&data_date=${encodeURIComponent(dataDate)}`;
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
      arg: [
        'categoriesPerRow=3',
        'views=grid(20,3) list(60) table(60)',
        'categoryView=grid',
        'searchView=list',
        `id=${storeDivId}`,
      ],
    },
  ];
}

export const GODADDY_STOREFRONT_URL = 'https://www.wrdlnkdn.com/store';
export const DEFAULT_ECWID_STOREFRONT_URL =
  'https://store129462253.company.site/';

/** Default Ecwid store ID for the in-app `/store` embed (override with `VITE_ECWID_STORE_ID`). */
export const DEFAULT_ECWID_EMBED_STORE_ID = '129462253';

type StorefrontEnv = {
  VITE_STORE_URL?: string;
  VITE_ECWID_STORE_ID?: string;
};

/** Ecwid Instant Site host pattern: `https://store{storeId}.company.site/` */
export function buildEcwidInstantSiteUrl(storeId: string): string {
  const id = storeId.trim();
  return `https://store${id}.company.site/`;
}

/**
 * Normalize `VITE_STORE_URL`: trim, add `https:` when the value has no scheme,
 * and resolve protocol-relative URLs (`//host/...`). Keeps GoDaddy-style env
 * entries like `www.example.com/store` usable without a broken `href`.
 */
export function normalizeExplicitStorefrontUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';

  if (/^https?:\/\//i.test(t)) {
    try {
      return new URL(t).href;
    } catch {
      return t;
    }
  }

  if (t.startsWith('//')) {
    try {
      return new URL(`https:${t}`).href;
    } catch {
      return `https:${t}`;
    }
  }

  try {
    return new URL(`https://${t}`).href;
  } catch {
    return t;
  }
}

/**
 * Public storefront URL for nav + `/store` redirect.
 *
 * **Priority:** non-empty `VITE_ECWID_STORE_ID` → Ecwid Instant Site
 * (`store{id}.company.site`). Otherwise `VITE_STORE_URL` if set. Otherwise default
 * embed store id → same Instant Site pattern.
 *
 * Ecwid ID wins so Vercel can keep a legacy `VITE_STORE_URL` without overriding
 * the live company.site shop.
 */
export function getAlternateStorefrontUrl(env?: StorefrontEnv): string {
  const viteStoreUrl = env?.VITE_STORE_URL ?? import.meta.env.VITE_STORE_URL;
  const viteEcwidId =
    env?.VITE_ECWID_STORE_ID ?? import.meta.env.VITE_ECWID_STORE_ID;

  const ecwidId = getEcwidStoreId(viteEcwidId);
  if (ecwidId) {
    return buildEcwidInstantSiteUrl(ecwidId);
  }

  const explicitRaw = typeof viteStoreUrl === 'string' ? viteStoreUrl : '';
  const explicit = normalizeExplicitStorefrontUrl(explicitRaw);
  if (explicit.length > 0 && explicit !== GODADDY_STOREFRONT_URL)
    return explicit;

  return DEFAULT_ECWID_STOREFRONT_URL;
}

/**
 * Canonical storefront URL for nav links and `/store` redirect (sync, env-driven).
 * Always returns a non-empty `http:` or `https:` URL string suitable for `href` / `location`.
 */
export function getStoreExternalUrl(env?: StorefrontEnv): string {
  return getAlternateStorefrontUrl(env);
}

const STOREFRONT_PROBE_TIMEOUT_MS = 3500;

/**
 * True when `url` returns a successful HTTP response (HEAD, or GET if HEAD is 405/501).
 * **Browser caveat:** cross-origin requests usually fail CORS, so this is only reliable for
 * same-origin checks or server-side use — not for picking the live shop URL in the SPA.
 */
export async function probeHttpReachable(url: string): Promise<boolean> {
  if (typeof fetch !== 'function') return false;

  const ctrl = new AbortController();
  const t = globalThis.setTimeout(() => {
    ctrl.abort();
  }, STOREFRONT_PROBE_TIMEOUT_MS);

  try {
    let res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: ctrl.signal,
      credentials: 'omit',
      redirect: 'follow',
    });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
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

export async function probeGodaddyStorefrontReachable(): Promise<boolean> {
  return probeHttpReachable(GODADDY_STOREFRONT_URL);
}

/**
 * Async alias of `getAlternateStorefrontUrl` (no browser probes — CORS makes them unreliable).
 * Kept for callers/tests that already await a Promise.
 */
export async function resolveStoreExternalUrl(
  env?: StorefrontEnv,
): Promise<string> {
  return getAlternateStorefrontUrl(env);
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

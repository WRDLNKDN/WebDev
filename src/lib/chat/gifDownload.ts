/**
 * Browser fetch helper for provider GIF URLs (e.g. GIPHY CDN) before chat upload /
 * server-side transcode. Keeps timeout + messaging consistent across surfaces.
 */

export const PROVIDER_GIF_FETCH_TIMEOUT_MS = 25_000;

export class ProviderGifFetchError extends Error {
  constructor(
    message: string,
    readonly code: 'timeout' | 'network' | 'http' | 'unknown',
  ) {
    super(message);
    this.name = 'ProviderGifFetchError';
  }
}

/**
 * Downloads a GIF blob from a public HTTPS URL (CORS must allow the app origin).
 */
export async function fetchProviderGifAsBlob(gifUrl: string): Promise<Blob> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => {
    controller.abort();
  }, PROVIDER_GIF_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(gifUrl, { signal: controller.signal });
    if (!res.ok) {
      throw new ProviderGifFetchError(
        `GIF could not be downloaded (${res.status}).`,
        'http',
      );
    }
    return await res.blob();
  } catch (e) {
    if (e instanceof ProviderGifFetchError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ProviderGifFetchError(
        'GIF download timed out. Try again or pick another GIF.',
        'timeout',
      );
    }
    const msg = e instanceof Error ? e.message : '';
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed')
    ) {
      throw new ProviderGifFetchError(
        'GIF download failed. Check your connection and try again.',
        'network',
      );
    }
    throw new ProviderGifFetchError(
      "We couldn't load that GIF. Try another one.",
      'unknown',
    );
  } finally {
    globalThis.clearTimeout(timer);
  }
}

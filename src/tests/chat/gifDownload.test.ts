import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchProviderGifAsBlob,
  PROVIDER_GIF_FETCH_TIMEOUT_MS,
} from '../../lib/chat/gifDownload';

describe('fetchProviderGifAsBlob', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns blob on success', async () => {
    const blob = new Blob(['GIF89a'], { type: 'image/gif' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      }),
    );
    const out = await fetchProviderGifAsBlob('https://media.giphy.com/x.gif');
    expect(out).toBe(blob);
  });

  it('throws ProviderGifFetchError on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );
    await expect(
      fetchProviderGifAsBlob('https://media.giphy.com/x.gif'),
    ).rejects.toMatchObject({
      code: 'http',
    });
  });

  it('throws timeout when the download is aborted', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) {
              reject(new Error('missing signal'));
              return;
            }
            const onAbort = () =>
              reject(new DOMException('Aborted', 'AbortError'));
            if (signal.aborted) onAbort();
            else signal.addEventListener('abort', onAbort, { once: true });
          }),
      ),
    );
    const settled = fetchProviderGifAsBlob(
      'https://media.giphy.com/x.gif',
    ).then(
      () => ({ ok: true as const, err: null }),
      (err: unknown) => ({ ok: false as const, err }),
    );
    await vi.advanceTimersByTimeAsync(PROVIDER_GIF_FETCH_TIMEOUT_MS + 1);
    const out = await settled;
    expect(out.ok).toBe(false);
    expect(out.err).toMatchObject({
      name: 'ProviderGifFetchError',
      code: 'timeout',
    });
  });
});

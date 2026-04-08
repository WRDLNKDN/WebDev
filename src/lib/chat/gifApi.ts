export type ChatGifResult = {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
};
export type GifContentFilter = 'off' | 'low' | 'medium' | 'high';

/**
 * Fixed GIPHY content tier for WRDLNKDN. The product does not expose per-session
 * “rating” controls; moderation and safety are handled in the media pipeline.
 */
export const PLATFORM_GIPHY_GIF_CONTENT_FILTER: GifContentFilter = 'medium';

/** GIPHY rating: g, pg, pg-13, r. We map our filter to these. Exported for unit tests. */
export const GIPHY_RATING_MAP: Record<GifContentFilter, string> = {
  off: 'r',
  low: 'pg-13',
  medium: 'pg',
  high: 'g',
};

type GiphyImageRendition = {
  url?: string;
  width?: string;
  height?: string;
};

type GiphyImages = {
  fixed_height?: GiphyImageRendition;
  fixed_height_small?: GiphyImageRendition;
  fixed_width?: GiphyImageRendition;
  original?: GiphyImageRendition;
  downsized?: GiphyImageRendition;
};

type GiphyGif = {
  id?: string;
  title?: string;
  images?: GiphyImages;
};

type GiphyResponse = {
  data?: GiphyGif[];
  meta?: { msg?: string; status?: number };
};

const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

function getGiphyApiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const key = env.VITE_GIPHY_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'GIF search is unavailable. Set VITE_GIPHY_API_KEY in env (get a key at developers.giphy.com).',
    );
  }
  return key;
}

function mapGiphyResults(raw: GiphyResponse): ChatGifResult[] {
  return (raw.data ?? [])
    .map((g): ChatGifResult | null => {
      const id = g.id;
      const images = g.images;
      const originalUrl =
        images?.original?.url ??
        images?.fixed_height?.url ??
        images?.fixed_width?.url;
      const previewUrl =
        images?.fixed_height_small?.url ??
        images?.fixed_height?.url ??
        images?.downsized?.url ??
        originalUrl;
      if (!id || !originalUrl || !previewUrl) return null;
      return {
        id,
        title: g.title ?? 'GIF',
        previewUrl,
        gifUrl: originalUrl,
      };
    })
    .filter((x): x is ChatGifResult => x != null);
}

async function fetchGiphy(
  path: string,
  params: URLSearchParams,
): Promise<ChatGifResult[]> {
  params.set('api_key', getGiphyApiKey());
  params.set('limit', params.get('limit') || '24');
  if (!params.has('rating')) {
    params.set('rating', 'pg');
  }

  const url = `${GIPHY_API_BASE}/${path}?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    throw new Error(
      msg.includes('Failed to fetch') || msg.includes('NetworkError')
        ? 'GIF search failed. Check your connection or try again.'
        : `Could not load GIFs: ${msg}`,
      { cause: e },
    );
  }

  const text = await res.text();
  if (!res.ok) {
    let detail: string;
    try {
      const body = JSON.parse(text) as {
        message?: string;
        meta?: { msg?: string };
      };
      detail = body?.message ?? body?.meta?.msg ?? '';
    } catch {
      detail = text.slice(0, 120);
    }
    if (res.status === 429) {
      throw new Error(
        'GIF search rate limit exceeded. Free tier allows 100 calls per hour—try again later.',
      );
    }
    throw new Error(
      detail
        ? `GIF search failed: ${detail}`
        : `GIF search failed (${res.status}). Set VITE_GIPHY_API_KEY in env (developers.giphy.com).`,
    );
  }

  let json: GiphyResponse;
  try {
    json = JSON.parse(text) as GiphyResponse;
  } catch {
    throw new Error('Invalid response from GIF service. Try again.');
  }
  return mapGiphyResults(json);
}

/** User-facing message when GIPHY/API key/rate-limit errors should not be shown raw. */
export const normalizeGifErrorMessage = (message: string): string => {
  const lower = message.toLowerCase();
  if (
    lower.includes('api key') ||
    lower.includes('apikey') ||
    lower.includes('invalid key') ||
    lower.includes('not valid')
  ) {
    return 'GIF search is unavailable right now.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('too many requests')
  ) {
    return 'GIF search is temporarily unavailable. You’ve hit the hourly limit—try again later.';
  }
  return message;
};

export async function getTrendingChatGifs(
  limit = 24,
  contentFilter: GifContentFilter = PLATFORM_GIPHY_GIF_CONTENT_FILTER,
): Promise<ChatGifResult[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('rating', GIPHY_RATING_MAP[contentFilter]);
  return fetchGiphy('trending', params);
}

export async function searchChatGifs(
  query: string,
  limit = 24,
  contentFilter: GifContentFilter = PLATFORM_GIPHY_GIF_CONTENT_FILTER,
): Promise<ChatGifResult[]> {
  const params = new URLSearchParams();
  params.set('q', query.slice(0, 50));
  params.set('limit', String(limit));
  params.set('rating', GIPHY_RATING_MAP[contentFilter]);
  return fetchGiphy('search', params);
}

export type ChatGifResult = {
  id: string;
  title: string;
  /**
   * Static or lightweight thumbnail for the picker grid (prefers GIPHY `_still`
   * renditions to cut motion + decode cost).
   */
  previewUrl: string;
  /**
   * URL embedded in posts / downloaded for chat upload. Prefers GIPHY `downsized*`
   * over `original` to reduce bandwidth; chat still runs GIF→MP4 when uploaded.
   */
  gifUrl: string;
};
export type GifContentFilter = 'off' | 'low' | 'medium' | 'high';

/**
 * Unified provider GIF policy:
 * - Single platform content tier (no member-facing rating UI).
 * - Picker uses still/small previews; picks use bandwidth-friendly playback URLs.
 * - Chat uploads: client fetch → existing `/api/chat/attachments/process-gif` (MP4 + poster).
 * - Feed/comments: store HTTPS GIF URL; inline render via `AssetInlinePreview` / legacy GIF asset.
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
  fixed_height_still?: GiphyImageRendition;
  fixed_height_small_still?: GiphyImageRendition;
  fixed_width?: GiphyImageRendition;
  fixed_width_still?: GiphyImageRendition;
  original?: GiphyImageRendition;
  original_still?: GiphyImageRendition;
  downsized?: GiphyImageRendition;
  downsized_still?: GiphyImageRendition;
  downsized_medium?: GiphyImageRendition;
  downsized_large?: GiphyImageRendition;
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

/** Grid thumbnail: still frames first to limit animated clutter in the picker. */
export function pickGiphyPreviewUrl(
  images: GiphyImages | undefined,
): string | null {
  if (!images) return null;
  const still =
    images.fixed_height_small_still?.url ??
    images.fixed_width_still?.url ??
    images.downsized_still?.url ??
    images.fixed_height_still?.url ??
    images.original_still?.url;
  if (still) return still;
  return (
    images.fixed_height_small?.url ??
    images.fixed_height?.url ??
    images.downsized?.url ??
    images.downsized_medium?.url ??
    images.downsized_large?.url ??
    images.fixed_width?.url ??
    images.original?.url ??
    null
  );
}

/** Playback URL for pick / embed: prefer downsized renditions over full original. */
export function pickGiphyPlaybackUrl(
  images: GiphyImages | undefined,
): string | null {
  if (!images) return null;
  return (
    images.downsized_large?.url ??
    images.downsized_medium?.url ??
    images.downsized?.url ??
    images.fixed_height?.url ??
    images.fixed_width?.url ??
    images.original?.url ??
    null
  );
}

export function giphyGifToChatResult(g: GiphyGif): ChatGifResult | null {
  const id = g.id;
  const images = g.images;
  const previewUrl = pickGiphyPreviewUrl(images);
  const gifUrl = pickGiphyPlaybackUrl(images);
  if (!id || !previewUrl || !gifUrl) return null;
  return {
    id,
    title: g.title ?? 'GIF',
    previewUrl,
    gifUrl,
  };
}

function mapGiphyResults(raw: GiphyResponse): ChatGifResult[] {
  return (raw.data ?? [])
    .map((g) => giphyGifToChatResult(g))
    .filter((x): x is ChatGifResult => x != null);
}

async function fetchGiphy(
  path: string,
  params: URLSearchParams,
): Promise<ChatGifResult[]> {
  params.set('api_key', getGiphyApiKey());
  params.set('limit', params.get('limit') || '24');
  if (!params.has('rating')) {
    params.set('rating', GIPHY_RATING_MAP[PLATFORM_GIPHY_GIF_CONTENT_FILTER]);
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

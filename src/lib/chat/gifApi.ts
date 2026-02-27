export type ChatGifResult = {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
};
export type GifContentFilter = 'off' | 'low' | 'medium' | 'high';

type TenorMediaFormat = {
  url?: string;
};

type TenorMediaFormats = Record<string, TenorMediaFormat | undefined>;

type TenorResult = {
  id?: string;
  content_description?: string;
  title?: string;
  media_formats?: TenorMediaFormats;
};

type TenorResponse = {
  results?: TenorResult[];
};

const TENOR_API_BASE = 'https://tenor.googleapis.com/v2';
const TENOR_CLIENT_KEY = 'wrdlnkdn-chat';
/** Example key from docs; set VITE_TENOR_API_KEY in env for production (Google Cloud). */
const TENOR_DEFAULT_KEY = 'LIVDSRZULELA';

function getTenorApiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_TENOR_API_KEY?.trim() || TENOR_DEFAULT_KEY;
}

function mapTenorResults(raw: TenorResponse): ChatGifResult[] {
  return (raw.results ?? [])
    .map((r): ChatGifResult | null => {
      const formats = r.media_formats;
      const gifUrl = formats?.gif?.url ?? formats?.mediumgif?.url;
      const previewUrl =
        formats?.tinygif?.url ??
        formats?.nanogif?.url ??
        formats?.gif?.url ??
        formats?.mediumgif?.url;
      if (!gifUrl || !previewUrl || !r.id) return null;
      return {
        id: r.id,
        title: r.content_description ?? r.title ?? 'GIF',
        previewUrl,
        gifUrl,
      };
    })
    .filter((x): x is ChatGifResult => x != null);
}

async function fetchTenor(path: string, params: URLSearchParams) {
  params.set('key', getTenorApiKey());
  params.set('client_key', TENOR_CLIENT_KEY);
  params.set('limit', params.get('limit') || '24');
  params.set('media_filter', 'minimal');
  params.set('contentfilter', params.get('contentfilter') || 'medium');

  const url = `${TENOR_API_BASE}/${path}?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    throw new Error(
      msg.includes('Failed to fetch') || msg.includes('NetworkError')
        ? 'GIF search failed. Check your connection or try again.'
        : `Could not load GIFs: ${msg}`,
    );
  }

  const text = await res.text();
  if (!res.ok) {
    let detail = '';
    try {
      const body = JSON.parse(text) as { error?: { message?: string } };
      detail = body?.error?.message ?? '';
    } catch {
      detail = text.slice(0, 120);
    }
    throw new Error(
      detail
        ? `GIF search failed: ${detail}`
        : `GIF search failed (${res.status}). Set VITE_TENOR_API_KEY in env for production.`,
    );
  }

  let json: TenorResponse;
  try {
    json = JSON.parse(text) as TenorResponse;
  } catch {
    throw new Error('Invalid response from GIF service. Try again.');
  }
  return mapTenorResults(json);
}

export async function getTrendingChatGifs(
  limit = 24,
  contentFilter: GifContentFilter = 'medium',
): Promise<ChatGifResult[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('contentfilter', contentFilter);
  return fetchTenor('featured', params);
}

export async function searchChatGifs(
  query: string,
  limit = 24,
  contentFilter: GifContentFilter = 'medium',
): Promise<ChatGifResult[]> {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', String(limit));
  params.set('contentfilter', contentFilter);
  return fetchTenor('search', params);
}

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

type TenorResult = {
  id?: string;
  content_description?: string;
  media_formats?: {
    tinygif?: TenorMediaFormat;
    gif?: TenorMediaFormat;
  };
};

type TenorResponse = {
  results?: TenorResult[];
};

const TENOR_API_BASE = 'https://tenor.googleapis.com/v2';
const TENOR_CLIENT_KEY = 'wrdlnkdn-chat';
const TENOR_DEFAULT_KEY = 'LIVDSRZULELA';

function getTenorApiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_TENOR_API_KEY?.trim() || TENOR_DEFAULT_KEY;
}

function mapTenorResults(raw: TenorResponse): ChatGifResult[] {
  return (raw.results ?? [])
    .map((r): ChatGifResult | null => {
      const gifUrl = r.media_formats?.gif?.url;
      const previewUrl = r.media_formats?.tinygif?.url ?? gifUrl;
      if (!gifUrl || !previewUrl || !r.id) return null;
      return {
        id: r.id,
        title: r.content_description || 'GIF',
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

  const res = await fetch(`${TENOR_API_BASE}/${path}?${params.toString()}`);
  if (!res.ok) throw new Error('Could not load GIFs right now.');
  const json = (await res.json()) as TenorResponse;
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

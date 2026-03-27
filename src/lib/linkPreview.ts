import { authedFetch } from './api/authFetch';
import { API_BASE, parseJsonResponse } from './api/feedsApiCore';

export type LinkPreviewData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

export { extractUrlsFromText, getFirstUrlFromText } from './urlPreviewText';

export async function fetchLinkPreview(
  rawUrl: string,
  accessToken?: string | null,
): Promise<LinkPreviewData | null> {
  const endpoint = `${API_BASE}/api/link-preview?url=${encodeURIComponent(rawUrl)}`;
  try {
    const res = await authedFetch(
      endpoint,
      { method: 'GET' },
      {
        accessToken: accessToken ?? null,
        includeJsonContentType: true,
        credentials: API_BASE ? 'omit' : 'include',
      },
    );
    if (!res.ok) return null;
    const json = await parseJsonResponse<{ data?: LinkPreviewData | null }>(
      res,
      endpoint,
    );
    return json.data ?? null;
  } catch {
    return null;
  }
}

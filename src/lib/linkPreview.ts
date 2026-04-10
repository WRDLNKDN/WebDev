import { authedFetch } from './api/authFetch';
import { API_BASE, parseJsonResponse } from './api/feedsApiCore';

/** Author overrides persisted on feed payloads; values win over fetched OG fields when set. */
export type LinkPreviewOverrides = {
  title?: string;
  description?: string;
  image?: string;
};

export type LinkPreviewData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  degraded?: boolean;
  overrides?: LinkPreviewOverrides;
};

export function getEffectiveLinkPreviewImage(
  preview: LinkPreviewData,
): string | undefined {
  const fromOverride = preview.overrides?.image?.trim();
  if (fromOverride) return fromOverride;
  const fromOg = preview.image?.trim();
  return fromOg || undefined;
}

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

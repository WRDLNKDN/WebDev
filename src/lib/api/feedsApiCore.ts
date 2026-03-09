import sjson from 'secure-json-parse';
import { messageFromApiResponse } from '../utils/errors';
import { authedFetch } from './authFetch';

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

export async function parseJsonResponse<T>(
  res: Response,
  requestUrl?: string,
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith('<!')) {
    const urlHint = requestUrl ? ` Request URL: ${requestUrl}.` : '';
    throw new Error(
      `Feeds API returned HTML instead of JSON.${urlHint} Set VITE_API_URL to your API origin only (e.g. https://api.wrdlnkdn.com) - no trailing /api. Redeploy after changing the env so the build picks it up. If VITE_API_URL is already set, ensure the API server is running and returns JSON for /api/feeds.`,
    );
  }
  if (trimmed === '') {
    throw new Error('Feeds API returned an empty response.');
  }
  try {
    return sjson.parse(text, undefined, {
      protoAction: 'remove',
      constructorAction: 'remove',
    }) as T;
  } catch {
    throw new Error(
      `Feeds API returned invalid JSON: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}`,
    );
  }
}

export async function requestJson<T>(
  url: string,
  options: RequestInit,
  accessToken?: string | null,
): Promise<T> {
  const res = await authedFetch(url, options, {
    accessToken: accessToken ?? null,
    includeJsonContentType: true,
    credentials: API_BASE ? 'omit' : 'include',
  });

  if (!res.ok) {
    let body: { error?: string; message?: string } = {};
    try {
      body = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
        url,
      );
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned HTML')) throw e;
    }
    throw new Error(
      messageFromApiResponse(res.status, body.error, body.message),
    );
  }

  return parseJsonResponse<T>(res, url);
}

export async function requestNoContent(
  url: string,
  options: RequestInit,
  accessToken?: string | null,
): Promise<void> {
  const res = await authedFetch(url, options, {
    accessToken: accessToken ?? null,
    includeJsonContentType: true,
    credentials: API_BASE ? 'omit' : 'include',
  });

  if (!res.ok && res.status !== 204) {
    let body: { error?: string } = {};
    try {
      body = await parseJsonResponse<{ error?: string }>(res, url);
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned HTML')) throw e;
    }
    throw new Error(messageFromApiResponse(res.status, body.error));
  }
}

export async function postFeed(
  body: Record<string, unknown>,
  accessToken?: string | null,
): Promise<void> {
  const postUrl = `${API_BASE}/api/feeds`;
  const res = await authedFetch(
    postUrl,
    { method: 'POST', body: JSON.stringify(body) },
    {
      accessToken: accessToken ?? null,
      includeJsonContentType: true,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );

  if (!res.ok) {
    let payload: { error?: string; message?: string } = {};
    try {
      payload = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
        postUrl,
      );
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned HTML')) throw e;
    }
    throw new Error(
      messageFromApiResponse(res.status, payload.error, payload.message),
    );
  }
}

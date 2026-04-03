import sjson from 'secure-json-parse';
import { messageFromApiResponse } from '../utils/errors';
import { authedFetch } from './authFetch';

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

type RequestJsonOptions = {
  accessToken?: string | null;
  includeJsonContentType?: boolean;
  credentials?: RequestCredentials;
  statusMessages?: Partial<Record<number, string>>;
};

type ErrorResponseBody = {
  error?: string;
  message?: string;
};

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

async function parseErrorResponseBody(
  res: Response,
  url: string,
): Promise<ErrorResponseBody> {
  try {
    return await parseJsonResponse<ErrorResponseBody>(res, url);
  } catch (e) {
    if (e instanceof Error && e.message.includes('returned HTML')) throw e;
    return {};
  }
}

function throwResponseError(
  status: number,
  body: ErrorResponseBody,
  statusMessages?: Partial<Record<number, string>>,
): never {
  const customMessage = statusMessages?.[status];
  if (customMessage) throw new Error(customMessage);
  throw new Error(messageFromApiResponse(status, body.error, body.message));
}

export async function requestAuthedResponse(
  url: string,
  options: RequestInit,
  requestOptions: RequestJsonOptions = {},
): Promise<Response> {
  const res = await authedFetch(url, options, {
    accessToken: requestOptions.accessToken ?? null,
    includeJsonContentType: requestOptions.includeJsonContentType ?? true,
    credentials: requestOptions.credentials ?? (API_BASE ? 'omit' : 'include'),
  });

  if (!res.ok) {
    const body = await parseErrorResponseBody(res, url);
    throwResponseError(res.status, body, requestOptions.statusMessages);
  }

  return res;
}

export async function requestAuthedJson<T>(
  url: string,
  options: RequestInit,
  requestOptions: RequestJsonOptions = {},
): Promise<T> {
  const res = await requestAuthedResponse(url, options, requestOptions);
  return parseJsonResponse<T>(res, url);
}

export async function requestJson<T>(
  url: string,
  options: RequestInit,
  accessToken?: string | null,
): Promise<T> {
  return requestAuthedJson<T>(url, options, {
    accessToken: accessToken ?? null,
  });
}

export async function requestNoContent(
  url: string,
  options: RequestInit,
  accessToken?: string | null,
): Promise<void> {
  await requestAuthedResponse(url, options, {
    accessToken: accessToken ?? null,
    includeJsonContentType: true,
  });
}

export async function postFeed(
  body: Record<string, unknown>,
  accessToken?: string | null,
): Promise<void> {
  const postUrl = `${API_BASE}/api/feeds`;
  await requestAuthedResponse(
    postUrl,
    { method: 'POST', body: JSON.stringify(body) },
    {
      accessToken: accessToken ?? null,
      includeJsonContentType: true,
    },
  );
}

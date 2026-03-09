import sjson from 'secure-json-parse';
import { messageFromApiResponse } from '../utils/errors';

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

export async function parseJson<T>(res: Response, url: string): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith('<!')) {
    throw new Error(
      `API returned HTML instead of JSON. Set VITE_API_URL. Request: ${url}`,
    );
  }
  if (trimmed === '') throw new Error('API returned empty response.');
  try {
    return sjson.parse(text, undefined, {
      protoAction: 'remove',
      constructorAction: 'remove',
    }) as T;
  } catch {
    throw new Error(`Invalid JSON: ${trimmed.slice(0, 80)}...`);
  }
}

export function throwApiError(
  status: number,
  data: { error?: string; message?: string } | undefined,
): never {
  throw new Error(messageFromApiResponse(status, data?.error, data?.message));
}

export const DEFAULT_RESUME_SUMMARY = {
  pending: 0,
  complete: 0,
  failed: 0,
  totalWithResume: 0,
  recentFailures: [],
  backfillLock: null,
  latestBackfillRuns: [],
};

/**
 * Directory API client — authenticated member discovery.
 * Calls /api/directory (list) and /api/directory/{connect,accept,decline,disconnect} (actions).
 */

import { messageFromApiResponse } from '../utils/errors';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authedFetch } from './authFetch';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

function directoryUrl(path: string, qs?: string): string {
  const base = `${API_BASE}/api/directory${path}`;
  return qs ? `${base}?${qs}` : base;
}

async function readDirectoryJsonBody(
  res: Response,
): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function throwIfDirectoryResponseNotOk(
  res: Response,
  data: Record<string, unknown>,
): void {
  if (res.ok) return;
  const msg = typeof data.error === 'string' ? data.error : undefined;
  const bodyMsg = typeof data.message === 'string' ? data.message : undefined;
  const retryAfter =
    typeof data.retryAfter === 'number' ? data.retryAfter : undefined;
  if (res.status === 429 && retryAfter != null) {
    throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`);
  }
  throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
}

export type DirectorySort = 'recently_active' | 'alphabetical' | 'newest';
export type ConnectionState =
  | 'not_connected'
  | 'pending'
  | 'pending_received'
  | 'connected';

export interface DirectoryMember {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar: string | null;
  tagline: string | null;
  pronouns: string | null;
  industry: string | null;
  secondary_industry: string | null;
  location: string | null;
  skills: string[];
  bio_snippet: string | null;
  connection_state: ConnectionState;
  use_weirdling_avatar: boolean;
  /** When set, link to public profile via /p/:profile_share_token to avoid 404. */
  profile_share_token?: string | null;
}

export interface DirectoryParams {
  q?: string;
  primary_industry?: string;
  secondary_industry?: string;
  location?: string;
  skills?: string[];
  interests?: string[];
  connection_status?: ConnectionState;
  sort?: DirectorySort;
  offset?: number;
  limit?: number;
}

export interface DirectoryResponse {
  data: DirectoryMember[];
  hasMore: boolean;
}

import { getProfileLink } from '../directory/profileLink';
import { buildDirectoryQueryString } from './directoryQueryParams';

export { buildDirectoryQueryString };
export { getProfileLink };

export async function fetchDirectory(
  supabase: SupabaseClient,
  params: DirectoryParams,
): Promise<DirectoryResponse> {
  const qs = buildDirectoryQueryString(params);
  const url = directoryUrl('', qs);
  const res = await authedFetch(
    url,
    { method: 'GET' },
    {
      client: supabase,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );
  const data = await readDirectoryJsonBody(res);
  throwIfDirectoryResponseNotOk(res, data);
  return {
    data: (data.data as DirectoryMember[]) ?? [],
    hasMore: Boolean(data.hasMore),
  };
}

const CONNECTIONS_EXPORT_PAGE_SIZE = 100;

/**
 * Fetches all members that are connected to the current user (for CSV export).
 * Paginates until no more results.
 */
export async function fetchAllConnectedMembers(
  supabase: SupabaseClient,
): Promise<DirectoryMember[]> {
  const all: DirectoryMember[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, hasMore: more } = await fetchDirectory(supabase, {
      connection_status: 'connected',
      sort: 'alphabetical',
      offset,
      limit: CONNECTIONS_EXPORT_PAGE_SIZE,
    });
    all.push(...data);
    hasMore = more && data.length === CONNECTIONS_EXPORT_PAGE_SIZE;
    offset += data.length;
  }
  return all;
}

export async function connectRequest(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    directoryUrl('/connect'),
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase, credentials: API_BASE ? 'omit' : 'include' },
  );
  const data = await readDirectoryJsonBody(res);
  throwIfDirectoryResponseNotOk(res, data);
}

export async function acceptRequest(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    directoryUrl('/accept'),
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase, credentials: API_BASE ? 'omit' : 'include' },
  );
  const data = await readDirectoryJsonBody(res);
  throwIfDirectoryResponseNotOk(res, data);
}

export async function declineRequest(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    directoryUrl('/decline'),
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase, credentials: API_BASE ? 'omit' : 'include' },
  );
  const data = await readDirectoryJsonBody(res);
  throwIfDirectoryResponseNotOk(res, data);
}

export async function cancelRequest(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    directoryUrl('/cancel'),
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase, credentials: API_BASE ? 'omit' : 'include' },
  );
  const data = await readDirectoryJsonBody(res);
  throwIfDirectoryResponseNotOk(res, data);
}

export async function disconnect(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    directoryUrl('/disconnect'),
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase, credentials: API_BASE ? 'omit' : 'include' },
  );
  const data = await readDirectoryJsonBody(res);
  throwIfDirectoryResponseNotOk(res, data);
}

/**
 * Directory API client — authenticated member discovery.
 * Calls /api/directory (list) and /api/directory/{connect,accept,decline,disconnect} (actions).
 */

import { messageFromApiResponse } from '../utils/errors';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authedFetch } from './authFetch';

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
  const url = `/api/directory${qs ? `?${qs}` : ''}`;
  const res = await authedFetch(url, { method: 'GET' }, { client: supabase });
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    const bodyMsg =
      typeof data?.message === 'string' ? data.message : undefined;
    const retryAfter =
      typeof data?.retryAfter === 'number' ? data.retryAfter : undefined;
    if (res.status === 429 && retryAfter != null) {
      throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`);
    }
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
  return {
    data: (data.data as DirectoryMember[]) ?? [],
    hasMore: Boolean(data.hasMore),
  };
}

export async function connectRequest(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    '/api/directory/connect',
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase },
  );
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    const bodyMsg =
      typeof data?.message === 'string' ? data.message : undefined;
    const retryAfter =
      typeof data?.retryAfter === 'number' ? data.retryAfter : undefined;
    if (res.status === 429 && retryAfter != null) {
      throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`);
    }
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
}

export async function acceptRequest(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    '/api/directory/accept',
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase },
  );
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    const bodyMsg =
      typeof data?.message === 'string' ? data.message : undefined;
    const retryAfter =
      typeof data?.retryAfter === 'number' ? data.retryAfter : undefined;
    if (res.status === 429 && retryAfter != null) {
      throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`);
    }
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
}

export async function declineRequest(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    '/api/directory/decline',
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase },
  );
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    const bodyMsg =
      typeof data?.message === 'string' ? data.message : undefined;
    const retryAfter =
      typeof data?.retryAfter === 'number' ? data.retryAfter : undefined;
    if (res.status === 429 && retryAfter != null) {
      throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`);
    }
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
}

export async function cancelRequest(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    '/api/directory/cancel',
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase },
  );
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    const bodyMsg =
      typeof data?.message === 'string' ? data.message : undefined;
    const retryAfter =
      typeof data?.retryAfter === 'number' ? data.retryAfter : undefined;
    if (res.status === 429 && retryAfter != null) {
      throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`);
    }
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
}

export async function disconnect(
  supabase: SupabaseClient,
  targetId: string,
): Promise<void> {
  const res = await authedFetch(
    '/api/directory/disconnect',
    {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    },
    { client: supabase },
  );
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    const bodyMsg =
      typeof data?.message === 'string' ? data.message : undefined;
    const retryAfter =
      typeof data?.retryAfter === 'number' ? data.retryAfter : undefined;
    if (res.status === 429 && retryAfter != null) {
      throw new Error(`Too many requests. Try again in ${retryAfter} seconds.`);
    }
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
}

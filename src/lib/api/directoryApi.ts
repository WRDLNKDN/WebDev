/**
 * Directory API client — authenticated member discovery.
 * Calls /api/directory (list) and /api/directory/{connect,accept,decline,disconnect} (actions).
 */

import { messageFromApiResponse } from '../utils/errors';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  location: string | null;
  skills: string[];
  bio_snippet: string | null;
  connection_state: ConnectionState;
  use_weirdling_avatar: boolean;
}

export interface DirectoryParams {
  q?: string;
  industry?: string;
  location?: string;
  skills?: string[];
  connection_status?: ConnectionState;
  sort?: DirectorySort;
  offset?: number;
  limit?: number;
}

export interface DirectoryResponse {
  data: DirectoryMember[];
  hasMore: boolean;
}

async function getAuthHeaders(supabase: SupabaseClient): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not signed in');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function fetchDirectory(
  supabase: SupabaseClient,
  params: DirectoryParams,
): Promise<DirectoryResponse> {
  const headers = await getAuthHeaders(supabase);
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.industry) sp.set('industry', params.industry);
  if (params.location) sp.set('location', params.location);
  if (params.skills?.length) sp.set('skills', params.skills.join(','));
  if (params.connection_status)
    sp.set('connection_status', params.connection_status);
  if (params.sort) sp.set('sort', params.sort);
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.limit != null) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  const url = `/api/directory${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers, credentials: 'include' });
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
  const headers = await getAuthHeaders(supabase);
  const res = await fetch('/api/directory/connect', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ targetId }),
  });
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
  const headers = await getAuthHeaders(supabase);
  const res = await fetch('/api/directory/accept', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ targetId }),
  });
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
  const headers = await getAuthHeaders(supabase);
  const res = await fetch('/api/directory/decline', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ targetId }),
  });
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
  const headers = await getAuthHeaders(supabase);
  const res = await fetch('/api/directory/disconnect', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ targetId }),
  });
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

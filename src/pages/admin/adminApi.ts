// src/pages/admin/adminApi.ts

import { messageFromApiResponse } from '../../lib/utils/errors';
import type { ProfileRow, ProfileStatus } from '../../types/types';

// Re-export types so other components importing from adminApi don't explode
export type { ProfileRow, ProfileStatus };

type FetchProfilesOpts = {
  status?: ProfileStatus | 'all';
  q?: string;
  limit?: number;
  offset?: number;
  sort?: 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
};

export const fetchProfiles = async (
  token: string,
  opts: FetchProfilesOpts = {},
): Promise<{ data: ProfileRow[]; count: number }> => {
  const {
    status = 'all',
    q = '',
    limit = 25,
    offset = 0,
    sort = 'created_at',
    order = 'asc',
  } = opts;

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles`);

  // Status filter
  if (status !== 'all') {
    url.searchParams.set('status', `eq.${status}`);
  }

  // Search filter
  if (q.trim()) {
    url.searchParams.set('or', `handle.ilike.*${q}*,id.eq.${q}`);
  }

  // Sorting
  url.searchParams.set('order', `${sort}.${order}`);

  // Pagination
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  // Request count
  url.searchParams.set('select', '*');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Prefer: 'count=exact',
    },
  });

  if (!res.ok) {
    let data: {
      error?: string;
      message?: string;
      details?: string;
      hint?: string;
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      data = {};
    }
    const rawMsg =
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
          ? data.message
          : undefined;
    const diagnostic = [rawMsg, data.details, data.hint]
      .filter(Boolean)
      .join(' | ');
    if (diagnostic) {
      console.error(
        '[Admin fetchProfiles]',
        res.status,
        url.toString(),
        diagnostic,
      );
    }
    throw new Error(
      messageFromApiResponse(
        res.status,
        data.error ?? (diagnostic || undefined),
        data.message,
      ),
    );
  }

  const data = (await res.json()) as ProfileRow[];
  const count = parseInt(
    res.headers.get('content-range')?.split('/')[1] || '0',
    10,
  );

  return { data, count };
};

const updateStatus = async (
  token: string,
  ids: string[],
  status: ProfileStatus,
): Promise<void> => {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=in.(${ids.join(',')})`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status,
      reviewed_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    let data: { error?: string };
    try {
      data = (await res.json()) as { error?: string };
    } catch {
      data = {};
    }
    const msg = typeof data.error === 'string' ? data.error : undefined;
    const bodyMsg =
      typeof (data as { message?: string }).message === 'string'
        ? (data as { message: string }).message
        : undefined;
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
};

export const approveProfiles = async (
  token: string,
  ids: string[],
): Promise<void> => {
  await updateStatus(token, ids, 'approved');
};

export const rejectProfiles = async (
  token: string,
  ids: string[],
): Promise<void> => {
  await updateStatus(token, ids, 'rejected');
};

export const disableProfiles = async (
  token: string,
  ids: string[],
): Promise<void> => {
  await updateStatus(token, ids, 'disabled');
};

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

export const deleteProfiles = async (
  token: string,
  ids: string[],
  hardDeleteAuthUsers = false,
): Promise<void> => {
  const url = `${API_BASE}/api/admin/profiles/delete`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids, hardDeleteAuthUsers }),
    credentials: API_BASE ? 'omit' : 'include',
  });

  if (!res.ok) {
    let data: { error?: string };
    try {
      data = (await res.json()) as { error?: string };
    } catch {
      data = {};
    }
    const msg = typeof data.error === 'string' ? data.error : undefined;
    const bodyMsg =
      typeof (data as { message?: string }).message === 'string'
        ? (data as { message: string }).message
        : undefined;
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
};

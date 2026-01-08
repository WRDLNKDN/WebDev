// src/admin/adminApi.ts

export type {
  ProfileStatus,
  ProfileRow,
  FetchProfilesParams,
} from '../types/types';

import type { FetchProfilesParams, ProfileRow } from '../types/types';

type ApiError = { message?: string };

const ADMIN_ENDPOINT =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_ADMIN_API_URL || '/api/admin';

const requestJson = async <T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const res = await fetch(`${ADMIN_ENDPOINT}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';

  // Helpful debugging when Vite returns index.html or a proxy route is missing
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    const preview = text.slice(0, 300).replace(/\s+/g, ' ').trim();
    throw new Error(
      `Expected JSON but got "${contentType || 'unknown'}" from ${ADMIN_ENDPOINT}${path}. ` +
        `This usually means the route is missing or the dev server returned index.html. ` +
        `Response preview: ${preview}`,
    );
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as ApiError;
      msg = body?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return (await res.json()) as T;
};

export const fetchProfiles = async (
  token: string,
  params: FetchProfilesParams,
): Promise<{ data: ProfileRow[]; count: number }> => {
  const qs = new URLSearchParams();
  qs.set('status', params.status);
  qs.set('q', params.q);
  qs.set('limit', String(params.limit));
  qs.set('offset', String(params.offset));
  qs.set('sort', params.sort);
  qs.set('order', params.order);

  return requestJson<{ data: ProfileRow[]; count: number }>(
    token,
    `/profiles?${qs.toString()}`,
  );
};

export const approveProfiles = async (token: string, ids: string[]) => {
  return requestJson<{ ok: true }>(token, '/profiles/approve', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const rejectProfiles = async (token: string, ids: string[]) => {
  return requestJson<{ ok: true }>(token, '/profiles/reject', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const disableProfiles = async (token: string, ids: string[]) => {
  return requestJson<{ ok: true }>(token, '/profiles/disable', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const deleteProfiles = async (
  token: string,
  ids: string[],
  hardDeleteAuthUsers: boolean,
) => {
  return requestJson<{ ok: true }>(token, '/profiles/delete', {
    method: 'POST',
    body: JSON.stringify({ ids, hardDeleteAuthUsers }),
  });
};

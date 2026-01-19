// src/admin/adminApi.ts
import type { FetchProfilesParams, ProfileRow, ProfileStatus } from '../types/types';

const API_BASE = '/api/admin';

const toMessage = async (res: Response) => {
  const text = await res.text().catch(() => '');
  if (!text) return `${res.status} ${res.statusText}`;
  return `${res.status} ${res.statusText}: ${text.slice(0, 300)}`;
};

async function requestJSON<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });

  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    throw new Error(await toMessage(res));
  }

  if (!ct.includes('application/json')) {
    const preview = await res.text().catch(() => '');
    throw new Error(
      `Expected JSON from ${API_BASE}${path}, got "${ct || 'unknown'}". Preview: ${preview.slice(
        0,
        200,
      )}`,
    );
  }

  return (await res.json()) as T;
}

const toQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined) return;
    usp.set(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export type FetchProfilesResult = { data: ProfileRow[]; count: number };

export const fetchProfiles = async (
  token: string,
  params: FetchProfilesParams,
): Promise<FetchProfilesResult> => {
  const qs = toQuery({
    status: params.status,
    q: params.q ?? '',
    limit: params.limit,
    offset: params.offset,
    sort: params.sort,
    order: params.order,
  });

  return requestJSON<FetchProfilesResult>(token, `/profiles${qs}`, {
    method: 'GET',
  });
};

type BulkBody = { ids: string[] };

const postBulk = async (token: string, path: string, ids: string[]) => {
  const body: BulkBody = { ids };
  await requestJSON<{ ok: true }>(token, path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const approveProfiles = async (token: string, ids: string[]) => {
  await postBulk(token, `/profiles/approve`, ids);
};

export const rejectProfiles = async (token: string, ids: string[]) => {
  await postBulk(token, `/profiles/reject`, ids);
};

export const disableProfiles = async (token: string, ids: string[]) => {
  await postBulk(token, `/profiles/disable`, ids);
};

export const deleteProfiles = async (
  token: string,
  ids: string[],
  hardDeleteAuthUsers: boolean,
) => {
  await requestJSON<{ ok: true; failedAuthDeletes?: string[] }>(token, `/profiles/delete`, {
    method: 'POST',
    body: JSON.stringify({ ids, hardDeleteAuthUsers }),
  });
};

// Re-export types so other components importing from adminApi don’t explode
export type { ProfileRow, ProfileStatus };
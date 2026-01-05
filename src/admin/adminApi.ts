export type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export type ProfileRow = {
  id: string;
  handle: string;
  status: ProfileStatus;
  created_at: string | null;
  updated_at: string | null;
  pronouns: string | null;
  geek_creds: string[] | null;
  nerd_creds: unknown | null;
  socials: unknown | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type FetchProfilesParams = {
  status: ProfileStatus | 'all';
  q: string;
  limit: number;
  offset: number;
  sort: 'created_at' | 'updated_at';
  order: 'asc' | 'desc';
};

type ApiError = { message?: string };

const ADMIN_ENDPOINT =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_ADMIN_API_URL || '/api/admin';

async function requestJson<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${ADMIN_ENDPOINT}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

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
}

export async function fetchProfiles(
  token: string,
  params: FetchProfilesParams,
): Promise<{ data: ProfileRow[]; count: number }> {
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
}

export async function approveProfiles(token: string, ids: string[]) {
  return requestJson<{ ok: true }>(token, '/profiles/approve', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function rejectProfiles(token: string, ids: string[]) {
  return requestJson<{ ok: true }>(token, '/profiles/reject', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function disableProfiles(token: string, ids: string[]) {
  return requestJson<{ ok: true }>(token, '/profiles/disable', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function deleteProfiles(
  token: string,
  ids: string[],
  hardDeleteAuthUsers: boolean,
) {
  return requestJson<{ ok: true }>(token, '/profiles/delete', {
    method: 'POST',
    body: JSON.stringify({ ids, hardDeleteAuthUsers }),
  });
}

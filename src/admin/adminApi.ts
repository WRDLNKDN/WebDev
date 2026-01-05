export type ProfileRow = {
  id: string;
  handle: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  pronouns?: string | null;
  geek_creds?: string[] | null;
  nerd_creds?: unknown;
  socials?: unknown;
};

type ListResponse = { data: ProfileRow[]; count: number };

type MutateResponse = { data: ProfileRow[]; count: number };

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = json?.error || json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

export async function listProfiles(
  token: string,
  params: {
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
    sort?: 'created_at_desc' | 'created_at_asc';
  },
): Promise<ListResponse> {
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.q) sp.set('q', params.q);
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.sort) sp.set('sort', params.sort);

  return request<ListResponse>(
    `/api/admin/profiles/list?${sp.toString()}`,
    token,
  );
}

export async function approveProfiles(
  token: string,
  ids: string[],
): Promise<MutateResponse> {
  return request<MutateResponse>('/api/admin/profiles/approve', token, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function rejectProfiles(
  token: string,
  ids: string[],
): Promise<MutateResponse> {
  return request<MutateResponse>('/api/admin/profiles/reject', token, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function disableProfiles(
  token: string,
  ids: string[],
): Promise<MutateResponse> {
  return request<MutateResponse>('/api/admin/profiles/disable', token, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function deleteProfiles(
  token: string,
  ids: string[],
  opts?: { deleteAuthUsers?: boolean },
): Promise<{ deleted: number; auth_deleted: number }> {
  return request<{ deleted: number; auth_deleted: number }>(
    '/api/admin/profiles/delete',
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        ids,
        delete_auth_users: Boolean(opts?.deleteAuthUsers),
      }),
    },
  );
}

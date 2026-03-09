import { API_BASE, parseJson, throwApiError } from './contentApiCore';
import type {
  AdminAuthCallbackLog,
  AdminPlaylist,
  ContentSubmissionRow,
} from './contentApiTypes';

export async function fetchAdminContentSubmissions(
  token: string,
  opts?: {
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    order?: string;
  },
): Promise<{
  data: ContentSubmissionRow[];
  meta: { total: number; limit: number; offset: number };
}> {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.q) params.set('q', opts.q);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.sort) params.set('sort', opts.sort);
  if (opts?.order) params.set('order', opts.order);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${API_BASE}/api/admin/content/submissions${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: API_BASE ? 'omit' : 'include',
  });

  const data = await parseJson<{
    ok: boolean;
    data: ContentSubmissionRow[];
    meta: { total: number; limit: number; offset: number };
    error?: string;
    message?: string;
  }>(res, '/api/admin/content/submissions');
  if (!res.ok) throwApiError(res.status, data);
  return {
    data: data.data ?? [],
    meta: data.meta ?? { total: 0, limit: 25, offset: 0 },
  };
}

async function adminContentAction(
  token: string,
  id: string,
  action: 'approve' | 'reject' | 'request-changes' | 'publish',
  payload: Record<string, unknown>,
): Promise<void> {
  const path = `/api/admin/content/${id}/${action}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: API_BASE ? 'omit' : 'include',
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{
    ok: boolean;
    error?: string;
    message?: string;
  }>(res, path);
  if (!res.ok) throwApiError(res.status, data);
}

export const approveContent = (token: string, id: string, notes?: string) =>
  adminContentAction(token, id, 'approve', { notes });

export const rejectContent = (token: string, id: string, reason?: string) =>
  adminContentAction(token, id, 'reject', { reason });

export const requestChangesContent = (
  token: string,
  id: string,
  notes?: string,
) => adminContentAction(token, id, 'request-changes', { notes });

export const publishContent = (
  token: string,
  id: string,
  playlistId: string,
  publishAt?: string,
) => adminContentAction(token, id, 'publish', { playlistId, publishAt });

export async function fetchAdminPlaylists(
  token: string,
): Promise<AdminPlaylist[]> {
  const res = await fetch(`${API_BASE}/api/admin/playlists`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: API_BASE ? 'omit' : 'include',
  });
  const data = await parseJson<{
    ok: boolean;
    data: AdminPlaylist[];
    error?: string;
    message?: string;
  }>(res, '/api/admin/playlists');
  if (!res.ok) throwApiError(res.status, data);
  return data.data ?? [];
}

export async function fetchAdminAuthCallbackLogs(
  token: string,
  limit = 10,
): Promise<{ data: AdminAuthCallbackLog[]; total: number }> {
  const qs = `?limit=${Math.max(1, Math.min(100, limit))}`;
  const res = await fetch(`${API_BASE}/api/admin/auth-callback-logs${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: API_BASE ? 'omit' : 'include',
  });
  const data = await parseJson<{
    ok: boolean;
    data?: AdminAuthCallbackLog[];
    meta?: { total?: number };
    error?: string;
    message?: string;
  }>(res, '/api/admin/auth-callback-logs');
  if (!res.ok) throwApiError(res.status, data);
  return { data: data.data ?? [], total: data.meta?.total ?? 0 };
}

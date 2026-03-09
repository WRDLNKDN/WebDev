import { authedFetch } from './authFetch';
import { API_BASE, parseJson, throwApiError } from './contentApiCore';
import type {
  PlaylistItem,
  PublicPlaylist,
  SubmitContentBody,
} from './contentApiTypes';

export async function submitContent(
  body: SubmitContentBody,
): Promise<{ id: string; status: string; createdAt: string }> {
  const res = await authedFetch(
    `${API_BASE}/api/content/submissions`,
    { method: 'POST', body: JSON.stringify(body) },
    {
      includeJsonContentType: true,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );
  const data = await parseJson<{
    ok: boolean;
    data?: { id: string; status: string; createdAt: string };
    error?: string;
    message?: string;
  }>(res, '/api/content/submissions');
  if (!res.ok) throwApiError(res.status, data);
  if (!data.ok || !data.data)
    throw new Error(data.error ?? 'Submission failed');
  return data.data;
}

export async function getUploadUrl(
  filename: string,
  contentType = 'video/mp4',
): Promise<{ uploadUrl: string; storagePath: string }> {
  const res = await authedFetch(
    `${API_BASE}/api/content/uploads/url`,
    { method: 'POST', body: JSON.stringify({ filename, contentType }) },
    {
      includeJsonContentType: true,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );
  const data = await parseJson<{
    ok: boolean;
    data?: { uploadUrl: string; storagePath: string };
    error?: string;
    message?: string;
  }>(res, '/api/content/uploads/url');
  if (!res.ok) throwApiError(res.status, data);
  if (!data.ok || !data.data)
    throw new Error(data.error ?? 'Failed to get upload URL');
  return data.data;
}

export async function fetchPublicPlaylists(opts?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: PublicPlaylist[]; meta: { total: number } }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/api/public/playlists${qs}`);
  const data = await parseJson<{
    ok: boolean;
    data: PublicPlaylist[];
    meta: { total: number };
    error?: string;
    message?: string;
  }>(res, '/api/public/playlists');
  if (!res.ok) throwApiError(res.status, data);
  return { data: data.data ?? [], meta: data.meta ?? { total: 0 } };
}

export async function fetchPlaylistItems(
  slug: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ data: PlaylistItem[]; meta: { total: number } }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(
    `${API_BASE}/api/public/playlists/${encodeURIComponent(slug)}/items${qs}`,
  );
  const data = await parseJson<{
    ok: boolean;
    data: PlaylistItem[];
    meta: { total: number };
    error?: string;
    message?: string;
  }>(res, `/api/public/playlists/${slug}/items`);
  if (!res.ok) throwApiError(res.status, data);
  return { data: data.data ?? [], meta: data.meta ?? { total: 0 } };
}

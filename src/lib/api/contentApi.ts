/**
 * Content API — submissions, upload URLs, public playlists, admin moderation.
 * Uses backend API (VITE_API_URL). Auth via Bearer token for protected endpoints.
 */

import sjson from 'secure-json-parse';
import { messageFromApiResponse } from '../utils/errors';
import { authedFetch } from './authFetch';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

async function parseJson<T>(res: Response, url: string): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith('<!')) {
    throw new Error(
      `API returned HTML instead of JSON. Set VITE_API_URL. Request: ${url}`,
    );
  }
  if (trimmed === '') throw new Error('API returned empty response.');
  try {
    return sjson.parse(text, undefined, {
      protoAction: 'remove',
      constructorAction: 'remove',
    }) as T;
  } catch {
    throw new Error(`Invalid JSON: ${trimmed.slice(0, 80)}...`);
  }
}

// --- Content submission (authenticated) ---

export type SubmitContentBody = {
  title: string;
  description?: string;
  type: 'youtube' | 'upload';
  youtubeUrl?: string;
  storagePath?: string;
  tags?: string[];
  notesForModerators?: string;
};

export async function submitContent(
  body: SubmitContentBody,
): Promise<{ id: string; status: string; createdAt: string }> {
  const res = await authedFetch(
    `${API_BASE}/api/content/submissions`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    {
      includeJsonContentType: true,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );
  const data = await parseJson<{
    ok: boolean;
    data?: { id: string; status: string; createdAt: string };
    error?: string;
  }>(res, '/api/content/submissions');
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  if (!data?.ok || !data.data)
    throw new Error(data?.error ?? 'Submission failed');
  return data.data;
}

export async function getUploadUrl(
  filename: string,
  contentType = 'video/mp4',
): Promise<{ uploadUrl: string; storagePath: string }> {
  const res = await authedFetch(
    `${API_BASE}/api/content/uploads/url`,
    {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    },
    {
      includeJsonContentType: true,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );
  const data = await parseJson<{
    ok: boolean;
    data?: { uploadUrl: string; storagePath: string };
    error?: string;
  }>(res, '/api/content/uploads/url');
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  if (!data?.ok || !data.data)
    throw new Error(data?.error ?? 'Failed to get upload URL');
  return data.data;
}

// --- Public playlists (no auth) ---

export type PublicPlaylist = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  itemCount: number;
  updatedAt: string;
};

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
  }>(res, '/api/public/playlists');
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        (data as { error?: string })?.error,
        (data as { message?: string })?.message,
      ),
    );
  return {
    data: data.data ?? [],
    meta: data.meta ?? { total: 0 },
  };
}

export type PlaylistItem = {
  id: string;
  title: string;
  submittedBy: { handle: string | null; displayName: string | null };
  type: 'youtube' | 'upload';
  youtubeUrl: string | null;
  storagePath: string | null;
  publishedAt: string;
};

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
  }>(res, `/api/public/playlists/${slug}/items`);
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        (data as { error?: string })?.error,
        (data as { message?: string })?.message,
      ),
    );
  return {
    data: data.data ?? [],
    meta: data.meta ?? { total: 0 },
  };
}

// --- Admin content moderation (requires admin token) ---

export type ContentSubmissionRow = {
  id: string;
  title: string;
  submittedBy: {
    id: string;
    handle: string | null;
    displayName: string | null;
  };
  type: string;
  status: string;
  submittedAt: string;
};

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
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: API_BASE ? 'omit' : 'include',
  });
  const data = await parseJson<{
    ok: boolean;
    data: ContentSubmissionRow[];
    meta: { total: number; limit: number; offset: number };
  }>(res, '/api/admin/content/submissions');
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        (data as { error?: string })?.error,
        (data as { message?: string })?.message,
      ),
    );
  return {
    data: data.data ?? [],
    meta: data.meta ?? { total: 0, limit: 25, offset: 0 },
  };
}

export async function approveContent(
  token: string,
  id: string,
  notes?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/content/${id}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: API_BASE ? 'omit' : 'include',
    body: JSON.stringify({ notes }),
  });
  const data = await parseJson<{ ok: boolean; error?: string }>(
    res,
    `/api/admin/content/${id}/approve`,
  );
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
}

export async function rejectContent(
  token: string,
  id: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/content/${id}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: API_BASE ? 'omit' : 'include',
    body: JSON.stringify({ reason }),
  });
  const data = await parseJson<{ ok: boolean; error?: string }>(
    res,
    `/api/admin/content/${id}/reject`,
  );
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
}

export async function requestChangesContent(
  token: string,
  id: string,
  notes?: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/admin/content/${id}/request-changes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: API_BASE ? 'omit' : 'include',
      body: JSON.stringify({ notes }),
    },
  );
  const data = await parseJson<{ ok: boolean; error?: string }>(
    res,
    `/api/admin/content/${id}/request-changes`,
  );
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
}

export async function publishContent(
  token: string,
  id: string,
  playlistId: string,
  publishAt?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/content/${id}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: API_BASE ? 'omit' : 'include',
    body: JSON.stringify({ playlistId, publishAt }),
  });
  const data = await parseJson<{ ok: boolean; error?: string }>(
    res,
    `/api/admin/content/${id}/publish`,
  );
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
}

export type AdminPlaylist = {
  id: string;
  slug: string;
  title: string;
  isPublic: boolean;
};

export type AdminResumeThumbnailSummary = {
  pending: number;
  complete: number;
  failed: number;
  totalWithResume: number;
  recentFailures: Array<{
    profileId: string;
    handle: string | null;
    error: string | null;
    updatedAt: string | null;
  }>;
  backfillLock: {
    runId: string;
    acquiredAt: string;
    adminEmail: string | null;
  } | null;
  latestBackfillRuns: Array<{
    id: string;
    action: string;
    runId: string | null;
    attempted: number | null;
    completed: number | null;
    failed: number | null;
    durationMs: number | null;
    createdAt: string;
  }>;
};

export type AdminResumeThumbnailFailure = {
  profileId: string;
  handle: string | null;
  resumeUrl: string | null;
  error: string | null;
  status: string;
  updatedAt: string | null;
};

export type AdminResumeThumbnailRun = {
  id: string;
  actorEmail: string | null;
  action: string;
  runId: string | null;
  attempted: number | null;
  completed: number | null;
  failed: number | null;
  durationMs: number | null;
  createdAt: string;
};

export type AdminResumeThumbnailRunDetails = {
  runId: string;
  events: Array<{
    id: string;
    actorEmail: string | null;
    action: string;
    createdAt: string;
    meta: Record<string, unknown>;
  }>;
};

export async function fetchAdminPlaylists(
  token: string,
): Promise<AdminPlaylist[]> {
  const res = await fetch(`${API_BASE}/api/admin/playlists`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: API_BASE ? 'omit' : 'include',
  });
  const data = await parseJson<{ ok: boolean; data: AdminPlaylist[] }>(
    res,
    '/api/admin/playlists',
  );
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        (data as { error?: string })?.error,
        (data as { message?: string })?.message,
      ),
    );
  return data.data ?? [];
}

export async function fetchAdminResumeThumbnailSummary(
  token: string,
): Promise<AdminResumeThumbnailSummary> {
  const res = await fetch(`${API_BASE}/api/admin/resume-thumbnails/summary`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: API_BASE ? 'omit' : 'include',
  });
  const data = await parseJson<{
    ok: boolean;
    data?: AdminResumeThumbnailSummary;
    error?: string;
    message?: string;
  }>(res, '/api/admin/resume-thumbnails/summary');
  if (!res.ok) {
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  }
  return (
    data.data ?? {
      pending: 0,
      complete: 0,
      failed: 0,
      totalWithResume: 0,
      recentFailures: [],
      backfillLock: null,
      latestBackfillRuns: [],
    }
  );
}

export async function fetchAdminResumeThumbnailFailures(
  token: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ data: AdminResumeThumbnailFailure[]; meta: { total: number } }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(
    `${API_BASE}/api/admin/resume-thumbnails/failures${qs}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      credentials: API_BASE ? 'omit' : 'include',
    },
  );
  const data = await parseJson<{
    ok: boolean;
    data?: AdminResumeThumbnailFailure[];
    meta?: { total?: number };
    error?: string;
    message?: string;
  }>(res, '/api/admin/resume-thumbnails/failures');
  if (!res.ok) {
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  }
  return {
    data: data.data ?? [],
    meta: { total: data.meta?.total ?? 0 },
  };
}

export async function retryAdminResumeThumbnail(
  token: string,
  profileId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/resume-thumbnails/retry`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: API_BASE ? 'omit' : 'include',
    body: JSON.stringify({ profileId }),
  });
  const data = await parseJson<{
    ok: boolean;
    error?: string;
    message?: string;
  }>(res, '/api/admin/resume-thumbnails/retry');
  if (!res.ok) {
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  }
}

export async function runAdminResumeThumbnailBackfill(
  token: string,
  limit = 25,
): Promise<{
  runId: string;
  attempted: number;
  completed: number;
  failed: number;
  durationMs: number;
}> {
  const res = await fetch(`${API_BASE}/api/admin/resume-thumbnails/backfill`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: API_BASE ? 'omit' : 'include',
    body: JSON.stringify({ limit }),
  });
  const data = await parseJson<{
    ok: boolean;
    data?: {
      runId?: string;
      attempted?: number;
      completed?: number;
      failed?: number;
      durationMs?: number;
    };
    error?: string;
    message?: string;
  }>(res, '/api/admin/resume-thumbnails/backfill');
  if (!res.ok) {
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  }
  return {
    runId: data.data?.runId ?? '',
    attempted: data.data?.attempted ?? 0,
    completed: data.data?.completed ?? 0,
    failed: data.data?.failed ?? 0,
    durationMs: data.data?.durationMs ?? 0,
  };
}

export async function fetchAdminResumeThumbnailRuns(
  token: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ data: AdminResumeThumbnailRun[]; meta: { total: number } }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/api/admin/resume-thumbnails/runs${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: API_BASE ? 'omit' : 'include',
  });
  const data = await parseJson<{
    ok: boolean;
    data?: AdminResumeThumbnailRun[];
    meta?: { total?: number };
    error?: string;
    message?: string;
  }>(res, '/api/admin/resume-thumbnails/runs');
  if (!res.ok) {
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  }
  return {
    data: data.data ?? [],
    meta: { total: data.meta?.total ?? 0 },
  };
}

export async function fetchAdminResumeThumbnailRunDetails(
  token: string,
  runId: string,
): Promise<AdminResumeThumbnailRunDetails> {
  const safeRunId = encodeURIComponent(runId);
  const res = await fetch(
    `${API_BASE}/api/admin/resume-thumbnails/runs/${safeRunId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      credentials: API_BASE ? 'omit' : 'include',
    },
  );
  const data = await parseJson<{
    ok: boolean;
    data?: AdminResumeThumbnailRunDetails;
    error?: string;
    message?: string;
  }>(res, `/api/admin/resume-thumbnails/runs/${safeRunId}`);
  if (!res.ok) {
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  }
  return data.data ?? { runId, events: [] };
}

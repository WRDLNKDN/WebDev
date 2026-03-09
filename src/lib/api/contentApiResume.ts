import {
  API_BASE,
  DEFAULT_RESUME_SUMMARY,
  parseJson,
  throwApiError,
} from './contentApiCore';
import type {
  AdminResumeThumbnailFailure,
  AdminResumeThumbnailRun,
  AdminResumeThumbnailRunDetails,
  AdminResumeThumbnailSummary,
} from './contentApiTypes';

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
  if (!res.ok) throwApiError(res.status, data);
  return (data.data ?? DEFAULT_RESUME_SUMMARY) as AdminResumeThumbnailSummary;
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
  if (!res.ok) throwApiError(res.status, data);
  return { data: data.data ?? [], meta: { total: data.meta?.total ?? 0 } };
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
  if (!res.ok) throwApiError(res.status, data);
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
  if (!res.ok) throwApiError(res.status, data);
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
  opts?: { limit?: number; offset?: number; action?: string; q?: string },
): Promise<{ data: AdminResumeThumbnailRun[]; meta: { total: number } }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.action) params.set('action', opts.action);
  if (opts?.q) params.set('q', opts.q);
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
  if (!res.ok) throwApiError(res.status, data);
  return { data: data.data ?? [], meta: { total: data.meta?.total ?? 0 } };
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
  if (!res.ok) throwApiError(res.status, data);
  return data.data ?? { runId, events: [] };
}

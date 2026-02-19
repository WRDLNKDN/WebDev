/**
 * Weirdling API client — calls backend /api/weirdling (proxied in dev).
 */

import { messageFromApiResponse } from '../utils/errors';
import { authedFetch } from './authFetch';
import type {
  WeirdlingPreview,
  WeirdlingWizardInputs,
  Weirdling,
} from '../../types/weirdling';

const API_BASE = '/api/weirdling';

export type GenerateResult = {
  ok: boolean;
  jobId: string;
  preview: WeirdlingPreview;
};

export async function generateWeirdling(
  inputs: WeirdlingWizardInputs,
  idempotencyKey?: string,
): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    displayNameOrHandle: inputs.displayNameOrHandle,
    roleVibe: inputs.roleVibe,
    industryOrInterests: inputs.industryOrInterests,
    tone: inputs.tone,
    boundaries: inputs.boundaries,
    bioSeed: inputs.bioSeed,
    includeImage: inputs.includeImage,
  };
  if (idempotencyKey) body.idempotency_key = idempotencyKey;

  const res = await authedFetch(
    `${API_BASE}/generate`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    { includeJsonContentType: true, credentials: 'include' },
  );

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
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
  return data as GenerateResult;
}

export async function saveWeirdlingByJobId(jobId: string): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/save`,
    {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    },
    { includeJsonContentType: true, credentials: 'include' },
  );
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
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
}

export async function saveWeirdlingPreview(
  preview: WeirdlingPreview,
): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/save`,
    {
      method: 'POST',
      body: JSON.stringify(preview),
    },
    { includeJsonContentType: true, credentials: 'include' },
  );
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
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
}

/** Returns all active Weirdlings for the current user (newest first). */
export async function getMyWeirdlings(): Promise<Weirdling[]> {
  try {
    const res = await authedFetch(
      `${API_BASE}/me`,
      { method: 'GET' },
      { includeJsonContentType: true, credentials: 'include' },
    );
    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      data = {};
    }
    if (!res.ok) {
      if (res.status === 401) return [];
      const msg = typeof data?.error === 'string' ? data.error : undefined;
      throw new Error(messageFromApiResponse(res.status, msg));
    }
    const list = Array.isArray(data?.weirdlings) ? data.weirdlings : [];
    return list as Weirdling[];
  } catch (e) {
    if (e instanceof Error && e.message === 'Not signed in') return [];
    throw e;
  }
}

/** @deprecated Use getMyWeirdlings(). Returns first Weirdling or null for backwards compatibility. */
export async function getMyWeirdling(): Promise<Weirdling | null> {
  const list = await getMyWeirdlings();
  return list[0] ?? null;
}

export async function deleteWeirdling(id: string): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/me/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
    { includeJsonContentType: false, credentials: 'include' },
  );
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
    throw new Error(messageFromApiResponse(res.status, msg, bodyMsg));
  }
}

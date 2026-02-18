/**
 * Weirdling API client — calls backend /api/weirdling (proxied in dev).
 */

import { messageFromApiResponse } from '../utils/errors';
import type {
  WeirdlingPreview,
  WeirdlingWizardInputs,
  Weirdling,
} from '../../types/weirdling';

const API_BASE = '/api/weirdling';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { supabase } = await import('../auth/supabaseClient');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not signed in');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

export type GenerateResult = {
  ok: boolean;
  jobId: string;
  preview: WeirdlingPreview;
};

export async function generateWeirdling(
  inputs: WeirdlingWizardInputs,
  idempotencyKey?: string,
): Promise<GenerateResult> {
  const headers = await getAuthHeaders();
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

  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
  });

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    throw new Error(messageFromApiResponse(res.status, msg));
  }
  return data as GenerateResult;
}

export async function saveWeirdlingByJobId(jobId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobId }),
    credentials: 'include',
  });
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    throw new Error(messageFromApiResponse(res.status, msg));
  }
}

export async function saveWeirdlingPreview(
  preview: WeirdlingPreview,
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers,
    body: JSON.stringify(preview),
    credentials: 'include',
  });
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    throw new Error(messageFromApiResponse(res.status, msg));
  }
}

/** Returns all active Weirdlings for the current user (newest first). */
export async function getMyWeirdlings(): Promise<Weirdling[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/me`, {
      headers,
      credentials: 'include',
    });
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
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/me/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : undefined;
    throw new Error(messageFromApiResponse(res.status, msg));
  }
}

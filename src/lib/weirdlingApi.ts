/**
 * Weirdling API client — calls backend /api/weirdling (proxied in dev).
 */

import type {
  WeirdlingPreview,
  WeirdlingWizardInputs,
  Weirdling,
} from '../types/weirdling';

const API_BASE = '/api/weirdling';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { supabase } = await import('./supabaseClient');
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data?.error as string) || res.statusText || 'Generation failed',
    );
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data?.error as string) || res.statusText || 'Save failed');
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data?.error as string) || res.statusText || 'Save failed');
  }
}

export async function getMyWeirdling(): Promise<Weirdling | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/me`, {
    headers,
    credentials: 'include',
  });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data?.error as string) || res.statusText || 'Fetch failed',
    );
  }
  return (data?.weirdling as Weirdling) ?? null;
}

/**
 * Weirdling API client — calls backend /api/weirdling (proxied in dev).
 */

import { messageFromApiResponse } from '../utils/errors';
import { authedFetch } from './authFetch';
import {
  API_BASE,
  requestAuthedJson,
  requestAuthedResponse,
} from './feedsApiCore';
import type {
  WeirdlingPreview,
  WeirdlingWizardInputs,
  Weirdling,
} from '../../types/weirdling';

const WEIRDLING_API = `${API_BASE}/api/weirdling`;

type WeirdlingJsonBody = Record<string, unknown>;
type PreviewRemainingResponse = {
  data?: {
    remaining?: number;
    limit?: number;
  };
};

async function readWeirdlingJsonBody(
  res: Response,
): Promise<WeirdlingJsonBody> {
  try {
    return (await res.json()) as WeirdlingJsonBody;
  } catch {
    return {};
  }
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

  return requestAuthedJson<GenerateResult>(
    `${WEIRDLING_API}/generate`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    {
      includeJsonContentType: true,
    },
  );
}

/** Remaining AI Weirdling preview generations for today (daily limit 5). */
export async function getPreviewRemaining(): Promise<{
  remaining: number;
  limit: number;
}> {
  const data = await requestAuthedJson<PreviewRemainingResponse>(
    `${WEIRDLING_API}/preview-remaining`,
    { method: 'GET' },
    {
      includeJsonContentType: false,
    },
  );
  return {
    remaining: data?.data?.remaining ?? 0,
    limit: data?.data?.limit ?? 5,
  };
}

export async function saveWeirdlingByJobId(jobId: string): Promise<void> {
  await requestAuthedResponse(
    `${WEIRDLING_API}/save`,
    {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    },
    {
      includeJsonContentType: true,
    },
  );
}

export async function saveWeirdlingPreview(
  preview: WeirdlingPreview,
): Promise<void> {
  await requestAuthedResponse(
    `${WEIRDLING_API}/save`,
    {
      method: 'POST',
      body: JSON.stringify(preview),
    },
    {
      includeJsonContentType: true,
    },
  );
}

/** Returns all active Weirdlings for the current user (newest first). */
export async function getMyWeirdlings(): Promise<Weirdling[]> {
  try {
    const res = await authedFetch(
      `${WEIRDLING_API}/me`,
      { method: 'GET' },
      {
        includeJsonContentType: true,
        credentials: API_BASE ? 'omit' : 'include',
      },
    );
    const data = await readWeirdlingJsonBody(res);
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
  await requestAuthedResponse(
    `${WEIRDLING_API}/me/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
    { includeJsonContentType: false, credentials: 'include' },
  );
}

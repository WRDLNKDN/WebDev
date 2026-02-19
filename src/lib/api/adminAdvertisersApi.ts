/**
 * Admin advertisers API — upload ad banner images via backend proxy.
 * Backend uses service role (bypasses RLS and bucket restrictions).
 */

import sjson from 'secure-json-parse';
import { messageFromApiResponse } from '../utils/errors';
import { authedFetch } from './authFetch';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

export async function uploadAdImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authedFetch(
    `${API_BASE}/api/admin/advertisers/upload`,
    {
      method: 'POST',
      body: formData,
    },
    {
      includeJsonContentType: false,
      credentials: API_BASE ? 'omit' : 'include',
    },
  );
  const text = await res.text();
  let data: { ok?: boolean; data?: { publicUrl?: string }; error?: string };
  try {
    data = sjson.parse(text, undefined, {
      protoAction: 'remove',
      constructorAction: 'remove',
    }) as typeof data;
  } catch {
    throw new Error(
      text.startsWith('<')
        ? 'API returned HTML. Set VITE_API_URL.'
        : 'Invalid response',
    );
  }
  if (!res.ok)
    throw new Error(
      messageFromApiResponse(
        res.status,
        data?.error,
        (data as { message?: string })?.message,
      ),
    );
  if (!data?.ok || !data.data?.publicUrl)
    throw new Error(data?.error ?? 'Upload failed');
  return data.data.publicUrl;
}

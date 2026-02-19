/**
 * Admin advertisers API — upload URL for ad banner images.
 */

import sjson from 'secure-json-parse';
import { messageFromApiResponse } from '../utils/errors';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { supabase } = await import('../auth/supabaseClient');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? null;
  if (!token) throw new Error('Not signed in');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getAdImageUploadUrl(
  filename: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/advertisers/upload-url`, {
    method: 'POST',
    headers,
    credentials: API_BASE ? 'omit' : 'include',
    body: JSON.stringify({ filename }),
  });
  const text = await res.text();
  let data: {
    ok?: boolean;
    data?: { uploadUrl?: string; publicUrl?: string };
    error?: string;
  };
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
  if (!res.ok) throw new Error(messageFromApiResponse(res.status, data?.error));
  if (!data?.ok || !data.data?.uploadUrl || !data.data?.publicUrl)
    throw new Error(data?.error ?? 'Failed to get upload URL');
  return {
    uploadUrl: data.data.uploadUrl,
    publicUrl: data.data.publicUrl,
  };
}

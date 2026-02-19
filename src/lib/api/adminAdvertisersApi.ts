/**
 * Admin advertisers API — upload ad banner images via backend proxy.
 * Backend uses service role (bypasses RLS and bucket restrictions).
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
  return { Authorization: `Bearer ${token}` };
}

export async function uploadAdImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/admin/advertisers/upload`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    credentials: API_BASE ? 'omit' : 'include',
    body: formData,
  });
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
  if (!res.ok) throw new Error(messageFromApiResponse(res.status, data?.error));
  if (!data?.ok || !data.data?.publicUrl)
    throw new Error(data?.error ?? 'Upload failed');
  return data.data.publicUrl;
}

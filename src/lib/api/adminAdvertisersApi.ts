/**
 * Admin advertisers API — upload ad/partner images directly to Supabase Storage.
 * This avoids Vercel request-size limits on large multipart uploads.
 */

import { supabase } from '../auth/supabaseClient';

export const AD_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
export const AD_IMAGE_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const AD_IMAGE_ALLOWED_LABEL = 'JPG, PNG, WEBP, GIF';

export function validateAdImageFile(file: File): string | null {
  if (
    !AD_IMAGE_ALLOWED_MIMES.includes(
      file.type as (typeof AD_IMAGE_ALLOWED_MIMES)[number],
    )
  ) {
    return `Unsupported image type. Allowed: ${AD_IMAGE_ALLOWED_LABEL}.`;
  }
  if (file.size > AD_IMAGE_MAX_BYTES) {
    const sizeMb = Math.ceil(file.size / (1024 * 1024));
    return `File too large (${sizeMb}MB). Max is 50MB.`;
  }
  return null;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message.trim();
    }
    if (typeof obj.error === 'string' && obj.error.trim()) {
      return obj.error.trim();
    }
  }
  return '';
}

function normalizeUploadError(error: unknown): string {
  const raw = extractErrorMessage(error).toLowerCase();

  if (
    /payload too large|request entity too large|limit_file_size|too large/.test(
      raw,
    )
  ) {
    return 'File too large. Max is 50MB.';
  }
  if (
    /invalid mime|mime type|unsupported media type|unsupported image type/.test(
      raw,
    )
  ) {
    return `Unsupported image type. Allowed: ${AD_IMAGE_ALLOWED_LABEL}.`;
  }
  if (
    /row-level security|rls|permission denied|forbidden|unauthorized|not authorized/.test(
      raw,
    )
  ) {
    return "You don't have permission to upload images. Please sign in again.";
  }
  if (/bucket.*not found|not found/.test(raw)) {
    return 'Image storage is not configured correctly. Please contact support.';
  }
  if (/failed to fetch|network|load failed|timeout/.test(raw)) {
    return 'Connection problem while uploading. Please try again.';
  }
  return 'Upload failed. Please try again in a moment.';
}

export async function uploadAdImage(file: File): Promise<string> {
  const path = `ads/${crypto.randomUUID()}-${file.name.replace(/\s+/g, '-')}`;
  const { error } = await supabase.storage
    .from('feed-ad-images')
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw new Error(normalizeUploadError(error));
  }

  const { data } = supabase.storage.from('feed-ad-images').getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error(
      'Upload succeeded, but we could not generate a public URL for this image.',
    );
  }
  return data.publicUrl;
}

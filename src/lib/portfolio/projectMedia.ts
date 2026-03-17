import { supabase } from '../auth/supabaseClient';

export const PROJECT_SOURCE_BUCKET = 'project-sources';
export const PROJECT_THUMBNAIL_BUCKET = 'project-images';

export const PROJECT_THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

const PROJECT_THUMBNAIL_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const getExtension = (name: string) =>
  name.split('.').pop()?.trim().toLowerCase() ?? '';

const formatSizeMb = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const THUMBNAIL_SIZE_GUIDANCE =
  'Optional thumbnails are limited to 2 MB. Use a smaller image.';

export function isProjectSourceStorageUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${PROJECT_SOURCE_BUCKET}/`);
}

function isAllowedFile(
  file: File,
  allowedMimeTypes: Set<string>,
  allowedExtensions: Set<string>,
): boolean {
  if (file.type && allowedMimeTypes.has(file.type.toLowerCase())) return true;
  return allowedExtensions.has(getExtension(file.name));
}

export function getProjectThumbnailFileError(file: File): string | null {
  if (
    !isAllowedFile(
      file,
      PROJECT_THUMBNAIL_ALLOWED_MIME_TYPES,
      new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']),
    )
  ) {
    return 'Optional thumbnails must be PNG, JPG, GIF, or WEBP images.';
  }
  if (file.size > PROJECT_THUMBNAIL_MAX_BYTES) {
    return `${file.name} is ${formatSizeMb(file.size)}. ${THUMBNAIL_SIZE_GUIDANCE}`;
  }
  return null;
}

export async function uploadPublicProjectAsset(params: {
  userId: string;
  file: File;
  bucket: string;
  prefix: string;
}): Promise<string> {
  const extension = getExtension(params.file.name) || 'bin';
  const path = `${params.userId}/${params.prefix}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(path, params.file, {
      upsert: true,
      contentType: params.file.type || undefined,
    });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from(params.bucket).getPublicUrl(path);
  if (!publicUrl) throw new Error('Storage URL not returned');
  return publicUrl;
}

export async function invokePortfolioThumbnailGeneration(): Promise<void> {
  try {
    await supabase.functions.invoke('generate-portfolio-thumbnail', {
      body: {},
    });
  } catch {
    // Thumbnail generation is best-effort and should not block saving.
  }
}

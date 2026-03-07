/**
 * Parse a Supabase public storage URL into an object path for a specific bucket.
 * Expected URL shape:
 *   .../storage/v1/object/public/{bucket}/{path}
 */
const getBucketObjectPathFromPublicUrl = (
  publicUrl: string,
  bucketId: string,
): string | null => {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;

  const marker = `/storage/v1/object/public/${bucketId}/`;
  const fallbackMarker = `/${bucketId}/`;

  const extract = (input: string, from: string): string | null => {
    const idx = input.indexOf(from);
    if (idx < 0) return null;
    const raw = input.slice(idx + from.length);
    if (!raw) return null;
    const noQuery = raw.split('?')[0]?.split('#')[0] ?? '';
    const clean = decodeURIComponent(noQuery).replace(/^\/+/, '').trim();
    return clean || null;
  };

  try {
    const parsed = new URL(trimmed);
    return (
      extract(parsed.pathname, marker) ??
      extract(parsed.pathname, fallbackMarker) ??
      null
    );
  } catch {
    return extract(trimmed, marker) ?? extract(trimmed, fallbackMarker) ?? null;
  }
};

export function getProjectImageStoragePathFromPublicUrl(
  publicUrl: string,
): string | null {
  return getBucketObjectPathFromPublicUrl(publicUrl, 'project-images');
}

export function getPortfolioThumbnailStoragePathFromPublicUrl(
  publicUrl: string,
): string | null {
  return getBucketObjectPathFromPublicUrl(publicUrl, 'portfolio-thumbnails');
}

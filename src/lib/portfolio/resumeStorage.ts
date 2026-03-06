/**
 * Derive storage path from resume public URL for delete.
 * URL shape: .../storage/v1/object/public/resumes/{userId}/resume.{ext}
 */
export function getResumeStoragePathFromPublicUrl(
  publicUrl: string,
): string | null {
  const match = publicUrl.match(/\/resumes\/(.+)$/);
  return match?.[1] ?? null;
}

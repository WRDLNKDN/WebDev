/** Client-side resume file detection for preview / thumbnail policy (PDF vs Word). */

export function resumePublicUrlLooksWord(
  fileName?: string | null,
  url?: string | null,
): boolean {
  const blob = `${fileName ?? ''} ${url ?? ''}`.toLowerCase();
  return /\.(doc|docx)(\?|#|$)/i.test(blob);
}

export function resumePublicUrlLooksPdf(
  fileName?: string | null,
  url?: string | null,
): boolean {
  const blob = `${fileName ?? ''} ${url ?? ''}`.toLowerCase();
  return /\.pdf(\?|#|$)/i.test(blob);
}

/** Only PDFs use server-side thumbnail generation; Word is opened by the member instead. */
export function resumeSupportsServerThumbnailGeneration(
  fileName?: string | null,
  url?: string | null,
): boolean {
  return resumePublicUrlLooksPdf(fileName, url);
}

export const RESUME_PREVIEW_UNSUPPORTED_MESSAGE =
  'Preview not supported for this file type. Open to view.';

export function isSupabasePublicResumeUrl(url: string): boolean {
  try {
    return new URL(url.trim()).pathname.includes('/object/public/resumes/');
  } catch {
    return false;
  }
}

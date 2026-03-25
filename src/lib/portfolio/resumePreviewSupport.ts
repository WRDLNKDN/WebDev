/** Client-side resume file detection for preview / thumbnail policy (PDF vs Word). */

export function resumePublicUrlLooksWord(
  fileName?: string | null,
  url?: string | null,
): boolean {
  const u = (url ?? '').toLowerCase();
  /** Served PDF (e.g. converted Word) must not be treated as an inline-Word resume. */
  if (/\.pdf(\?|#|$)/i.test(u)) return false;
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

/** True when the API can render a card thumbnail (matches backend `isSupportedResumeThumbnailExtension`). */
export function resumeSupportsServerThumbnailGeneration(
  fileName?: string | null,
  url?: string | null,
): boolean {
  const blob = `${fileName ?? ''} ${url ?? ''}`.toLowerCase();
  return /\.(pdf|doc|docx)(\?|#|$)/i.test(blob);
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

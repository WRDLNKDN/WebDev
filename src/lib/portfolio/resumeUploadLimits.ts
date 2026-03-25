/** Portfolio resume uploads: size policy (aligned with SPIKE — Word is not auto-shrunk; PDF may be lightly re-saved). */

export const RESUME_MAX_FILE_BYTES = 6 * 1024 * 1024;

/** Inform Members when they are close to the hard cap. */
export const RESUME_SOFT_SIZE_WARNING_BYTES = 5 * 1024 * 1024;

/** Screen readers + `aria-describedby` for hidden resume file inputs. */
export const RESUME_UPLOAD_ACCESSIBILITY_DESCRIPTION =
  'Accepted formats: PDF or Word (.doc, .docx). Maximum size 6 megabytes. PDFs may be lightly optimized before upload; Word files are not compressed.';

export function formatResumeOversizeMessage(fileSize: number): string {
  const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
  return `Resume is too large (${sizeMb} MB). Maximum size is 6 MB. For PDFs, use “reduce file size” or export with compressed images. For Word, save as a smaller PDF or shorten the document, then try again.`;
}

export function getResumeSoftSizeNote(fileSize: number): string | null {
  if (
    fileSize > RESUME_SOFT_SIZE_WARNING_BYTES &&
    fileSize <= RESUME_MAX_FILE_BYTES
  ) {
    return 'This file is close to the 6 MB limit. If anything fails, export a more compact PDF.';
  }
  return null;
}

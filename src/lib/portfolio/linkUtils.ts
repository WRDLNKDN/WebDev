/**
 * Portfolio link type detection and Google Workspace URL canonicalization.
 * Portfolio items are URL-only; supported targets: direct file URLs and Google Docs/Sheets/Slides.
 */

export const SUPPORTED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
] as const;

export const SUPPORTED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;

export const SUPPORTED_PRESENTATION_EXTENSIONS = ['ppt', 'pptx'] as const;

export const SUPPORTED_SPREADSHEET_EXTENSIONS = ['xls', 'xlsx'] as const;

export const SUPPORTED_TEXT_EXTENSIONS = ['txt', 'md'] as const;

export const SUPPORTED_FILE_EXTENSIONS = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
  ...SUPPORTED_PRESENTATION_EXTENSIONS,
  ...SUPPORTED_SPREADSHEET_EXTENSIONS,
  ...SUPPORTED_TEXT_EXTENSIONS,
] as const;

const GOOGLE_DOCS_HOST =
  /^https:\/\/(?:www\.)?docs\.google\.com\/document\/d\//i;
const GOOGLE_SHEETS_HOST =
  /^https:\/\/(?:www\.)?docs\.google\.com\/spreadsheets\/d\//i;
const GOOGLE_SLIDES_HOST =
  /^https:\/\/(?:www\.)?docs\.google\.com\/presentation\/d\//i;

/** Normalize Google Workspace URL to canonical embed/preview format (no /edit). */
export function normalizeGoogleUrl(url: string): string {
  const u = url.trim();
  try {
    const parsed = new URL(u);
    const path = parsed.pathname;
    const hash = parsed.hash;
    let basePath = path.replace(/\/edit\/?$/i, '').replace(/\/view\/?$/i, '');
    if (
      GOOGLE_DOCS_HOST.test(u) ||
      GOOGLE_SLIDES_HOST.test(u) ||
      GOOGLE_SHEETS_HOST.test(u)
    ) {
      if (!basePath.endsWith('/preview'))
        basePath = basePath.replace(/\/?$/, '/preview');
      return `${parsed.origin}${basePath}${hash}`;
    }
  } catch {
    // ignore
  }
  return u;
}

/** Get file extension from URL path (lowercase, no query). */
function getExtension(url: string): string {
  try {
    const pathname = new URL(url.trim()).pathname;
    const segment = pathname.split('/').filter(Boolean).pop() ?? '';
    const dot = segment.lastIndexOf('.');
    return dot >= 0 ? segment.slice(dot + 1).toLowerCase() : '';
  } catch {
    return '';
  }
}

export type PortfolioLinkType =
  | 'image'
  | 'pdf'
  | 'document'
  | 'presentation'
  | 'spreadsheet'
  | 'text'
  | 'google_doc'
  | 'google_sheet'
  | 'google_slides'
  | 'unsupported';

/** Detect link type from URL (extension or Google host). */
export function getLinkType(url: string): PortfolioLinkType {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return 'unsupported';

  if (GOOGLE_DOCS_HOST.test(u)) return 'google_doc';
  if (GOOGLE_SHEETS_HOST.test(u)) return 'google_sheet';
  if (GOOGLE_SLIDES_HOST.test(u)) return 'google_slides';

  const ext = getExtension(u);
  if (
    SUPPORTED_IMAGE_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number],
    )
  )
    return 'image';
  if (ext === 'pdf') return 'pdf';
  if (
    SUPPORTED_DOCUMENT_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number],
    )
  )
    return 'document';
  if (
    SUPPORTED_PRESENTATION_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_PRESENTATION_EXTENSIONS)[number],
    )
  )
    return 'presentation';
  if (
    SUPPORTED_SPREADSHEET_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_SPREADSHEET_EXTENSIONS)[number],
    )
  )
    return 'spreadsheet';
  if (
    SUPPORTED_TEXT_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_TEXT_EXTENSIONS)[number],
    )
  )
    return 'text';

  return 'unsupported';
}

/** Human-readable file type label for UI. */
export function getLinkTypeLabel(type: PortfolioLinkType): string {
  switch (type) {
    case 'image':
      return 'Image';
    case 'pdf':
      return 'PDF';
    case 'document':
      return 'Document';
    case 'presentation':
      return 'Presentation';
    case 'spreadsheet':
      return 'Spreadsheet';
    case 'text':
      return 'Text';
    case 'google_doc':
      return 'Google Doc';
    case 'google_sheet':
      return 'Google Sheet';
    case 'google_slides':
      return 'Google Slides';
    default:
      return 'Link';
  }
}

/** Whether the link type supports inline preview (image, PDF, Google embed). */
export function isPreviewableType(type: PortfolioLinkType): boolean {
  return (
    type === 'image' ||
    type === 'pdf' ||
    type === 'document' ||
    type === 'presentation' ||
    type === 'spreadsheet' ||
    type === 'google_doc' ||
    type === 'google_sheet' ||
    type === 'google_slides'
  );
}

/**
 * Client-side portfolio file validation (no Supabase / uploadIntake). Safe for
 * unit tests. Keep policy aligned with `uploadIntake` `portfolio_source`.
 */
import {
  getUploadSizeDecision,
  getUploadSurfaceGuidance,
  PROJECT_SOURCE_HARD_MAX_BYTES,
  PROJECT_THUMBNAIL_HARD_MAX_BYTES,
} from '../media/mediaSizePolicy';
import {
  SUPPORTED_DOCUMENT_EXTENSIONS,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_PRESENTATION_EXTENSIONS,
  SUPPORTED_SPREADSHEET_EXTENSIONS,
  SUPPORTED_TEXT_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from './linkUtils';

/** @see uploadIntake `EXTENSION_TO_MIME` — portfolio_source policy */
const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

const PROJECT_FILE_EXTENSIONS = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
  ...SUPPORTED_PRESENTATION_EXTENSIONS,
  ...SUPPORTED_SPREADSHEET_EXTENSIONS,
  ...SUPPORTED_TEXT_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS,
].map((ext) => `.${ext}`);

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
] as const;
const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

const ALLOWED_PORTFOLIO_SOURCE_MIME = new Set<string>([
  ...IMAGE_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
]);

const PROJECT_SOURCE_UNSUPPORTED =
  'Project files must be JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MP4, WEBM, or MOV.';

function getFileExtensionDot(name: string | undefined): string {
  if (typeof name !== 'string' || !name.trim()) return '';
  const lower = name.toLowerCase().trim();
  const lastDot = lower.lastIndexOf('.');
  return lastDot >= 0 ? lower.slice(lastDot) : '';
}

function normalizePortfolioSourceMime(file: File): string | null {
  const rawType = file.type?.toLowerCase().trim() ?? '';
  if (rawType) return rawType;
  return EXTENSION_TO_MIME[getFileExtensionDot(file.name)] ?? null;
}

function isPortfolioSourceTypeAllowed(
  file: File,
  detectedMime: string | null,
): boolean {
  const extension = getFileExtensionDot(file.name);
  return (
    (detectedMime != null && ALLOWED_PORTFOLIO_SOURCE_MIME.has(detectedMime)) ||
    PROJECT_FILE_EXTENSIONS.includes(extension)
  );
}

const getExtension = (name: string) =>
  name.split('.').pop()?.trim().toLowerCase() ?? '';

const formatSizeMb = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const THUMBNAIL_SIZE_GUIDANCE =
  getUploadSurfaceGuidance('portfolio_thumbnail') ??
  'Optional thumbnails: aim for about 2 MB; larger inputs are optimized when possible.';
const SOURCE_SIZE_GUIDANCE =
  getUploadSurfaceGuidance('portfolio_source') ??
  'Aim for about 2 MB when possible; larger files may be optimized up to platform limits.';

const PROJECT_THUMBNAIL_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

function isAllowedThumbnailFile(file: File): boolean {
  if (
    file.type &&
    PROJECT_THUMBNAIL_ALLOWED_MIME_TYPES.has(file.type.toLowerCase())
  )
    return true;
  return new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']).has(
    getExtension(file.name),
  );
}

export function getProjectThumbnailFileError(file: File): string | null {
  if (!isAllowedThumbnailFile(file)) {
    return 'Optional thumbnails must be PNG, JPG, GIF, or WEBP images.';
  }
  if (file.size > PROJECT_THUMBNAIL_HARD_MAX_BYTES) {
    return `${file.name} is ${formatSizeMb(file.size)}. ${THUMBNAIL_SIZE_GUIDANCE}`;
  }
  return null;
}

export function getProjectSourceFileError(file: File): string | null {
  const detectedMime = normalizePortfolioSourceMime(file);
  if (!isPortfolioSourceTypeAllowed(file, detectedMime)) {
    return PROJECT_SOURCE_UNSUPPORTED;
  }

  const mimeForPolicy =
    detectedMime ??
    EXTENSION_TO_MIME[getFileExtensionDot(file.name)] ??
    'application/octet-stream';

  const sizeDecision = getUploadSizeDecision({
    surface: 'portfolio_source',
    size: file.size,
    mimeType: mimeForPolicy,
  });

  if (!sizeDecision.accepted) {
    return file.size > PROJECT_SOURCE_HARD_MAX_BYTES
      ? `${file.name} is ${formatSizeMb(file.size)}. ${SOURCE_SIZE_GUIDANCE}`
      : sizeDecision.reason;
  }

  return null;
}

import { supabase } from '../auth/supabaseClient';
import { uploadStructuredPublicAsset } from '../media/ingestion';
import {
  getUploadSurfaceGuidance,
  PROJECT_SOURCE_HARD_MAX_BYTES,
  PROJECT_SOURCE_MAX_BYTES,
  PROJECT_THUMBNAIL_HARD_MAX_BYTES,
  PROJECT_THUMBNAIL_MAX_BYTES,
} from '../media/mediaSizePolicy';
import {
  getSharedUploadRejectionReason,
  runSharedUploadIntake,
} from '../media/uploadIntake';
import { toMessage } from '../utils/errors';
import {
  SUPPORTED_DOCUMENT_EXTENSIONS,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_PRESENTATION_EXTENSIONS,
  SUPPORTED_SPREADSHEET_EXTENSIONS,
  SUPPORTED_TEXT_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from './linkUtils';
import { toMessage } from '../utils/errors';

export const PROJECT_SOURCE_BUCKET = 'project-sources';
export const PROJECT_THUMBNAIL_BUCKET = 'project-images';
export {
  PROJECT_SOURCE_HARD_MAX_BYTES,
  PROJECT_SOURCE_MAX_BYTES,
  PROJECT_THUMBNAIL_HARD_MAX_BYTES,
  PROJECT_THUMBNAIL_MAX_BYTES,
};

export type ProjectUploadField = 'source' | 'thumbnail';

export class ProjectUploadFieldError extends Error {
  readonly field: ProjectUploadField;

  constructor(field: ProjectUploadField, message: string) {
    super(message);
    this.name = 'ProjectUploadFieldError';
    this.field = field;
  }
}

export function isProjectUploadFieldError(
  error: unknown,
  field?: ProjectUploadField,
): error is ProjectUploadFieldError {
  return (
    error instanceof ProjectUploadFieldError &&
    (field == null || error.field === field)
  );
}

export function toProjectUploadFieldError(
  field: ProjectUploadField,
  error: unknown,
): ProjectUploadFieldError {
  return error instanceof ProjectUploadFieldError
    ? error
    : new ProjectUploadFieldError(field, toMessage(error));
}

const PROJECT_THUMBNAIL_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);
const PROJECT_SOURCE_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const getExtension = (name: string) =>
  name.split('.').pop()?.trim().toLowerCase() ?? '';

const formatSizeMb = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const THUMBNAIL_SIZE_GUIDANCE =
  getUploadSurfaceGuidance('portfolio_thumbnail') ??
  'Optional thumbnails are optimized automatically.';
const SOURCE_SIZE_GUIDANCE =
  getUploadSurfaceGuidance('portfolio_source') ??
  'Project files are optimized automatically.';
const PROJECT_THUMBNAIL_LIMIT_FAILURE_MESSAGE =
  'Optional thumbnail is still too large after optimization. Try a smaller or simpler image.';

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
  // Type check first: always authoritative regardless of size.
  if (
    !isAllowedFile(
      file,
      PROJECT_THUMBNAIL_ALLOWED_MIME_TYPES,
      new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']),
    )
  ) {
    return 'Optional thumbnails must be PNG, JPG, GIF, or WEBP images.';
  }
  // Size check: use policy constants directly so the message always reflects
  // the current 6 MB soft / 15 MB hard limit and is never stale.
  // Do NOT delegate to getSharedUploadRejectionReason for size — it may carry
  // outdated copy (e.g. a legacy 2 MB threshold) that contradicts the current
  // portfolio thumbnail policy.
  if (file.size > PROJECT_THUMBNAIL_HARD_MAX_BYTES) {
    return `${file.name} is ${formatSizeMb(file.size)}. ${THUMBNAIL_SIZE_GUIDANCE}`;
  }
  return isAllowedFile(
    file,
    PROJECT_THUMBNAIL_ALLOWED_MIME_TYPES,
    new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']),
  )
    ? null
    : 'Optional thumbnails must be PNG, JPG, GIF, or WEBP images.';
}

export function getProjectSourceFileError(file: File): string | null {
  const sharedRejection = getSharedUploadRejectionReason(
    'portfolio_source',
    file,
  );
  if (sharedRejection) {
    return file.size > PROJECT_SOURCE_HARD_MAX_BYTES
      ? `${file.name} is ${formatSizeMb(file.size)}. ${SOURCE_SIZE_GUIDANCE}`
      : sharedRejection;
  }
  return isAllowedFile(
    file,
    PROJECT_SOURCE_ALLOWED_MIME_TYPES,
    new Set([
      ...SUPPORTED_IMAGE_EXTENSIONS,
      ...SUPPORTED_DOCUMENT_EXTENSIONS,
      ...SUPPORTED_PRESENTATION_EXTENSIONS,
      ...SUPPORTED_SPREADSHEET_EXTENSIONS,
      ...SUPPORTED_TEXT_EXTENSIONS,
      ...SUPPORTED_VIDEO_EXTENSIONS,
    ]),
  )
    ? null
    : 'Project files must be JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MP4, WEBM, or MOV.';
}

export async function uploadPublicProjectAsset(params: {
  userId: string;
  file: File;
  bucket: string;
  prefix: string;
  returnVariant?: 'display' | 'original';
}): Promise<string> {
  const returnVariant = params.returnVariant ?? 'display';
  const surface =
    params.bucket === PROJECT_SOURCE_BUCKET
      ? 'portfolio_source'
      : 'portfolio_thumbnail';

  return runSharedUploadIntake({
    surface,
    file: params.file,
    executeUpload: async ({ file, detectedMimeType }) => {
      const extension = getExtension(file.name);
      const isImageUpload =
        detectedMimeType.startsWith('image/') ||
        SUPPORTED_IMAGE_EXTENSIONS.includes(
          extension as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number],
        );

      if (isImageUpload) {
        const asset = await uploadStructuredPublicAsset({
          bucket: params.bucket,
          ownerId: params.userId,
          scope: params.prefix,
          file,
          retainOriginal: true,
          maxDisplayBytes:
            params.bucket === PROJECT_THUMBNAIL_BUCKET
              ? PROJECT_THUMBNAIL_MAX_BYTES
              : null,
          displayLimitFailureMessage:
            params.bucket === PROJECT_THUMBNAIL_BUCKET
              ? PROJECT_THUMBNAIL_LIMIT_FAILURE_MESSAGE
              : null,
        });
        return returnVariant === 'original'
          ? (asset.originalUrl ?? asset.displayUrl)
          : asset.displayUrl;
      }

      const uploadExtension = extension || 'bin';
      const path = `${params.userId}/${params.prefix}-${Date.now()}.${uploadExtension}`;
      const { error } = await supabase.storage
        .from(params.bucket)
        .upload(path, file, {
          upsert: true,
          contentType: detectedMimeType || file.type || undefined,
        });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from(params.bucket).getPublicUrl(path);
      if (!publicUrl) throw new Error('Storage URL not returned');
      return publicUrl;
    },
  });
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

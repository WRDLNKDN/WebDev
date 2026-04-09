import { supabase } from '../auth/supabaseClient';
import { uploadStructuredPublicAsset } from '../media/ingestion';
import { PROJECT_THUMBNAIL_MAX_BYTES } from '../media/mediaSizePolicy';
import { runSharedUploadIntake } from '../media/uploadIntake';
import { toMessage } from '../utils/errors';
import { SUPPORTED_IMAGE_EXTENSIONS } from './linkUtils';

export {
  getProjectSourceFileError,
  getProjectThumbnailFileError,
} from './projectSourceFileGate';

export const PROJECT_SOURCE_BUCKET = 'project-sources';
export const PROJECT_THUMBNAIL_BUCKET = 'project-images';
export {
  PROJECT_SOURCE_HARD_MAX_BYTES,
  PROJECT_SOURCE_MAX_BYTES,
  PROJECT_THUMBNAIL_HARD_MAX_BYTES,
  PROJECT_THUMBNAIL_MAX_BYTES,
} from '../media/mediaSizePolicy';

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

const getExtension = (name: string) =>
  name.split('.').pop()?.trim().toLowerCase() ?? '';

const PROJECT_THUMBNAIL_LIMIT_FAILURE_MESSAGE =
  'Optional thumbnail is still too large after optimization. Try a smaller or simpler image.';

export function isProjectSourceStorageUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${PROJECT_SOURCE_BUCKET}/`);
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

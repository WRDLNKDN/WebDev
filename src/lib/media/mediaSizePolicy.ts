import type { PlatformUploadSurface } from './uploadSurface';

const MB = 1024 * 1024;

export const SHARED_MEDIA_SOFT_LIMIT_BYTES = 6 * MB;
export const SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES = 15 * MB;
export const CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES = 2 * MB;
export const CHAT_GIF_DIRECT_UPLOAD_MAX_FILE_BYTES =
  SHARED_MEDIA_SOFT_LIMIT_BYTES;
export const CHAT_GIF_PROCESSING_MAX_FILE_BYTES = SHARED_MEDIA_SOFT_LIMIT_BYTES;
export const CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES =
  SHARED_MEDIA_SOFT_LIMIT_BYTES;
export const RESUME_MAX_FILE_BYTES = SHARED_MEDIA_SOFT_LIMIT_BYTES;
export const RESUME_SOFT_SIZE_WARNING_BYTES = 5 * MB;
export const PROFILE_AVATAR_INPUT_HARD_LIMIT_BYTES =
  SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES;
export const PROFILE_AVATAR_OUTPUT_MAX_FILE_BYTES = 1 * MB;
export const PROFILE_RESUME_INPUT_HARD_LIMIT_BYTES =
  SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES;
export const PROFILE_RESUME_THUMBNAIL_INPUT_HARD_LIMIT_BYTES =
  SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES;
export const PROFILE_RESUME_THUMBNAIL_OUTPUT_MAX_FILE_BYTES = 2 * MB;
export const PROJECT_SOURCE_MAX_BYTES = SHARED_MEDIA_SOFT_LIMIT_BYTES;
export const PROJECT_SOURCE_HARD_MAX_BYTES =
  SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES;
export const PROJECT_THUMBNAIL_MAX_BYTES = SHARED_MEDIA_SOFT_LIMIT_BYTES;
export const PROJECT_THUMBNAIL_HARD_MAX_BYTES =
  SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES;
export const STRUCTURED_MEDIA_INPUT_HARD_LIMIT_BYTES =
  SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES;

export type MediaCompressionStrategy =
  | 'none'
  | 'image_derivatives'
  | 'avatar_resize'
  | 'gif_transcode'
  | 'pdf_resave'
  | 'resume_preview_resize'
  | 'preview_generation';

export type UploadSizePolicyId =
  | 'feed_image'
  | 'chat_file'
  | 'chat_image'
  | 'chat_gif'
  | 'chat_processed_gif'
  | 'chat_pdf'
  | 'profile_avatar'
  | 'profile_resume_pdf'
  | 'profile_resume_word'
  | 'profile_resume_thumbnail'
  | 'portfolio_source_image'
  | 'portfolio_source_pdf'
  | 'portfolio_source_other'
  | 'portfolio_thumbnail'
  | 'group_image';

export type ResolvedUploadSizePolicy = {
  policyId: UploadSizePolicyId;
  hardLimitBytes: number;
  softLimitBytes: number | null;
  directUploadMaxBytes: number | null;
  transformBeforeReject: boolean;
  enforcePreparedSoftLimit: boolean;
  compressionStrategy: MediaCompressionStrategy;
};

export type UploadSizeDecision =
  | {
      accepted: true;
      mode: 'direct' | 'optimize' | 'gif_processing';
      uploadLabel: string;
      helperText: string | null;
      policy: ResolvedUploadSizePolicy;
    }
  | {
      accepted: false;
      reason: string;
      policy: ResolvedUploadSizePolicy;
    };

function formatBytesAsMegabytes(
  bytes: number,
  options?: { compact?: boolean; precision?: number },
): string {
  const precision = options?.precision ?? (bytes >= 10 * MB ? 0 : 1);
  const label = (bytes / MB).toFixed(precision);
  return options?.compact ? `${label}MB` : `${label} MB`;
}

function createPolicy(
  policy: ResolvedUploadSizePolicy,
): ResolvedUploadSizePolicy {
  return policy;
}

function acceptDecision(
  policy: ResolvedUploadSizePolicy,
  mode: 'direct' | 'optimize' | 'gif_processing',
  uploadLabel: string,
  helperText: string | null,
): UploadSizeDecision {
  return {
    accepted: true,
    mode,
    uploadLabel,
    helperText,
    policy,
  };
}

function rejectDecision(
  policy: ResolvedUploadSizePolicy,
  reason: string,
): UploadSizeDecision {
  return {
    accepted: false,
    reason,
    policy,
  };
}

function buildImageHardLimitMessage(
  label: string,
  bytes: number,
  hardLimitBytes: number,
): string {
  return `${label} is too large (${formatBytesAsMegabytes(bytes)}). We can optimize images up to ${formatBytesAsMegabytes(hardLimitBytes)}.`;
}

function buildProjectHardLimitMessage(
  bytes: number,
  hardLimitBytes: number,
  subject: string,
): string {
  return `${formatBytesAsMegabytes(bytes, { compact: true })} file selected. ${subject} can start up to ${formatBytesAsMegabytes(hardLimitBytes)} and are optimized toward a ${formatBytesAsMegabytes(SHARED_MEDIA_SOFT_LIMIT_BYTES)} target. Compress the file before uploading or choose a smaller file.`;
}

export function formatResumeOversizeMessage(
  fileSize: number,
  mimeType = 'application/pdf',
): string {
  const sizeMb = formatBytesAsMegabytes(fileSize);
  if (mimeType === 'application/pdf') {
    return `Resume is too large (${sizeMb}). PDFs can start up to ${formatBytesAsMegabytes(PROFILE_RESUME_INPUT_HARD_LIMIT_BYTES)} and are optimized toward the ${formatBytesAsMegabytes(RESUME_MAX_FILE_BYTES)} upload limit. Compress the PDF or export a smaller version, then try again.`;
  }

  return `Resume is too large (${sizeMb}). Word files must already be ${formatBytesAsMegabytes(RESUME_MAX_FILE_BYTES)} or smaller. Save as a smaller PDF or shorten the document, then try again.`;
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

export const RESUME_UPLOAD_ACCESSIBILITY_DESCRIPTION =
  'Accepted formats: PDF or Word (.doc, .docx). Word files must be 6 megabytes or smaller. PDFs can start up to 15 megabytes and are optimized toward the 6 megabyte upload limit when possible.';

export function getUploadSurfaceGuidance(
  surface: PlatformUploadSurface,
): string | null {
  switch (surface) {
    case 'portfolio_source':
      return 'Project images and PDFs are optimized toward a 6 MB target and can start up to 15 MB. Other project files should already be 6 MB or smaller.';
    case 'portfolio_thumbnail':
      return 'Optional thumbnails are optimized toward a 6 MB target and can start up to 15 MB.';
    case 'profile_resume':
      return 'Word files must already be 6 MB or smaller. PDFs can start up to 15 MB and are optimized toward a 6 MB upload limit.';
    default:
      return null;
  }
}

export function getUploadSurfaceHardLimitBytes(
  surface: PlatformUploadSurface,
  mimeType?: string | null,
): number {
  return getUploadSizeDecision({
    surface,
    mimeType: mimeType ?? 'application/octet-stream',
    size: 0,
  }).policy.hardLimitBytes;
}

export function getPreparedUploadLimitFailure(
  policy: ResolvedUploadSizePolicy,
  size: number,
  mimeType: string,
): string | null {
  if (!policy.enforcePreparedSoftLimit || policy.softLimitBytes == null) {
    return null;
  }
  if (size <= policy.softLimitBytes) return null;

  switch (policy.policyId) {
    case 'profile_avatar':
      return 'Avatar is still too large after optimization. Try a smaller or simpler image.';
    case 'profile_resume_pdf':
      return formatResumeOversizeMessage(size, mimeType);
    case 'profile_resume_thumbnail':
      return 'Preview image is still too large after optimization. Try a smaller or simpler image.';
    case 'portfolio_source_pdf':
      return 'This PDF is still too large after optimization. Export a smaller PDF and try again.';
    case 'chat_pdf':
      return 'This PDF is still too large after optimization. Try a smaller file or compress it first.';
    default:
      return null;
  }
}

export function getUploadSizeDecision(params: {
  surface: PlatformUploadSurface;
  size: number;
  mimeType: string;
}): UploadSizeDecision {
  const mimeType = params.mimeType.toLowerCase().trim();
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isProcessedGifVideo =
    mimeType === 'video/mp4' || mimeType === 'video/webm';

  switch (params.surface) {
    case 'feed_post_image': {
      const policy = createPolicy({
        policyId: 'feed_image',
        hardLimitBytes: SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES,
        softLimitBytes: SHARED_MEDIA_SOFT_LIMIT_BYTES,
        directUploadMaxBytes: null,
        transformBeforeReject: true,
        enforcePreparedSoftLimit: false,
        compressionStrategy: 'image_derivatives',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(
          policy,
          buildImageHardLimitMessage(
            'Image',
            params.size,
            policy.hardLimitBytes,
          ),
        );
      }
      return acceptDecision(
        policy,
        'optimize',
        'Uploading image...',
        'Optimizing image for feed...',
      );
    }
    case 'chat_attachment': {
      if (isProcessedGifVideo) {
        const policy = createPolicy({
          policyId: 'chat_processed_gif',
          hardLimitBytes: CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES,
          softLimitBytes: CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES,
          directUploadMaxBytes: CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES,
          transformBeforeReject: false,
          enforcePreparedSoftLimit: false,
          compressionStrategy: 'none',
        });
        if (params.size > policy.hardLimitBytes) {
          return rejectDecision(
            policy,
            'This GIF is too large to process. Try a smaller file.',
          );
        }
        return acceptDecision(
          policy,
          'direct',
          'Attaching optimized GIF...',
          null,
        );
      }

      if (mimeType === 'image/gif') {
        const policy = createPolicy({
          policyId: 'chat_gif',
          hardLimitBytes: CHAT_GIF_DIRECT_UPLOAD_MAX_FILE_BYTES,
          softLimitBytes: CHAT_GIF_DIRECT_UPLOAD_MAX_FILE_BYTES,
          directUploadMaxBytes: CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
          transformBeforeReject: true,
          enforcePreparedSoftLimit: false,
          compressionStrategy:
            params.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES
              ? 'gif_transcode'
              : 'none',
        });
        if (params.size > policy.hardLimitBytes) {
          return rejectDecision(
            policy,
            'This GIF is too large to process. Try a smaller file.',
          );
        }
        if (params.size <= CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES) {
          return acceptDecision(policy, 'direct', 'Uploading GIF...', null);
        }
        return acceptDecision(
          policy,
          'gif_processing',
          'Converting GIF...',
          'Converting GIF into lightweight looping playback...',
        );
      }

      if (isImage) {
        const policy = createPolicy({
          policyId: 'chat_image',
          hardLimitBytes: SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES,
          softLimitBytes: SHARED_MEDIA_SOFT_LIMIT_BYTES,
          directUploadMaxBytes: CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
          transformBeforeReject: true,
          enforcePreparedSoftLimit: false,
          compressionStrategy: 'image_derivatives',
        });
        if (params.size > policy.hardLimitBytes) {
          return rejectDecision(
            policy,
            `This image is too large to optimize. Try one under ${formatBytesAsMegabytes(policy.hardLimitBytes)}.`,
          );
        }
        return acceptDecision(
          policy,
          'optimize',
          'Optimizing attachment...',
          'Optimizing image and generating preview...',
        );
      }

      if (isPdf) {
        const policy = createPolicy({
          policyId: 'chat_pdf',
          hardLimitBytes: SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES,
          softLimitBytes: SHARED_MEDIA_SOFT_LIMIT_BYTES,
          directUploadMaxBytes: CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
          transformBeforeReject: true,
          enforcePreparedSoftLimit: true,
          compressionStrategy:
            params.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES
              ? 'pdf_resave'
              : 'none',
        });
        if (params.size > policy.hardLimitBytes) {
          return rejectDecision(
            policy,
            `This PDF is too large to optimize. Try one under ${formatBytesAsMegabytes(policy.hardLimitBytes)}.`,
          );
        }
        if (params.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES) {
          return acceptDecision(
            policy,
            'optimize',
            'Optimizing attachment...',
            'Optimizing PDF and generating preview...',
          );
        }
        return acceptDecision(
          policy,
          'direct',
          'Uploading attachment...',
          null,
        );
      }

      const policy = createPolicy({
        policyId: 'chat_file',
        hardLimitBytes: CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES,
        softLimitBytes: CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES,
        directUploadMaxBytes: CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
        transformBeforeReject: params.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
        enforcePreparedSoftLimit: false,
        compressionStrategy:
          params.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES
            ? 'preview_generation'
            : 'none',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(
          policy,
          'This file is too large to process. Try a file under 6 MB.',
        );
      }
      if (params.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES) {
        return acceptDecision(
          policy,
          'optimize',
          'Optimizing attachment...',
          'Preparing attachment preview...',
        );
      }
      return acceptDecision(policy, 'direct', 'Uploading attachment...', null);
    }
    case 'profile_avatar': {
      const policy = createPolicy({
        policyId: 'profile_avatar',
        hardLimitBytes: PROFILE_AVATAR_INPUT_HARD_LIMIT_BYTES,
        softLimitBytes: PROFILE_AVATAR_OUTPUT_MAX_FILE_BYTES,
        directUploadMaxBytes: null,
        transformBeforeReject: true,
        enforcePreparedSoftLimit: true,
        compressionStrategy: 'avatar_resize',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(
          policy,
          'Avatar image is too large. We can optimize avatar images up to 15 MB.',
        );
      }
      return acceptDecision(
        policy,
        'optimize',
        'Uploading avatar...',
        'Preparing avatar...',
      );
    }
    case 'profile_resume': {
      if (isPdf) {
        const policy = createPolicy({
          policyId: 'profile_resume_pdf',
          hardLimitBytes: PROFILE_RESUME_INPUT_HARD_LIMIT_BYTES,
          softLimitBytes: RESUME_MAX_FILE_BYTES,
          directUploadMaxBytes: CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
          transformBeforeReject: true,
          enforcePreparedSoftLimit: true,
          compressionStrategy: 'pdf_resave',
        });
        if (params.size > policy.hardLimitBytes) {
          return rejectDecision(
            policy,
            formatResumeOversizeMessage(params.size, mimeType),
          );
        }
        return acceptDecision(
          policy,
          'optimize',
          'Uploading resume...',
          'Optimizing PDF before upload...',
        );
      }

      const policy = createPolicy({
        policyId: 'profile_resume_word',
        hardLimitBytes: RESUME_MAX_FILE_BYTES,
        softLimitBytes: RESUME_MAX_FILE_BYTES,
        directUploadMaxBytes: RESUME_MAX_FILE_BYTES,
        transformBeforeReject: false,
        enforcePreparedSoftLimit: false,
        compressionStrategy: 'none',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(
          policy,
          formatResumeOversizeMessage(params.size, mimeType),
        );
      }
      return acceptDecision(policy, 'direct', 'Uploading resume...', null);
    }
    case 'profile_resume_thumbnail': {
      const policy = createPolicy({
        policyId: 'profile_resume_thumbnail',
        hardLimitBytes: PROFILE_RESUME_THUMBNAIL_INPUT_HARD_LIMIT_BYTES,
        softLimitBytes: PROFILE_RESUME_THUMBNAIL_OUTPUT_MAX_FILE_BYTES,
        directUploadMaxBytes: null,
        transformBeforeReject: true,
        enforcePreparedSoftLimit: true,
        compressionStrategy: 'resume_preview_resize',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(
          policy,
          'Preview image is too large. We can optimize preview images up to 15 MB.',
        );
      }
      return acceptDecision(
        policy,
        'optimize',
        'Uploading preview image...',
        'Preparing resume preview...',
      );
    }
    case 'portfolio_source': {
      if (isImage) {
        const policy = createPolicy({
          policyId: 'portfolio_source_image',
          hardLimitBytes: PROJECT_SOURCE_HARD_MAX_BYTES,
          softLimitBytes: PROJECT_SOURCE_MAX_BYTES,
          directUploadMaxBytes: null,
          transformBeforeReject: true,
          enforcePreparedSoftLimit: false,
          compressionStrategy: 'image_derivatives',
        });
        if (params.size > policy.hardLimitBytes) {
          return rejectDecision(
            policy,
            buildProjectHardLimitMessage(
              params.size,
              policy.hardLimitBytes,
              'Project images',
            ),
          );
        }
        return acceptDecision(
          policy,
          'optimize',
          'Uploading project file...',
          'Optimizing project image...',
        );
      }

      if (isPdf) {
        const policy = createPolicy({
          policyId: 'portfolio_source_pdf',
          hardLimitBytes: PROJECT_SOURCE_HARD_MAX_BYTES,
          softLimitBytes: PROJECT_SOURCE_MAX_BYTES,
          directUploadMaxBytes: CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
          transformBeforeReject: true,
          enforcePreparedSoftLimit: true,
          compressionStrategy: 'pdf_resave',
        });
        if (params.size > policy.hardLimitBytes) {
          return rejectDecision(
            policy,
            buildProjectHardLimitMessage(
              params.size,
              policy.hardLimitBytes,
              'Project PDFs',
            ),
          );
        }
        return acceptDecision(
          policy,
          'optimize',
          'Uploading project file...',
          'Optimizing PDF before upload...',
        );
      }

      const policy = createPolicy({
        policyId: 'portfolio_source_other',
        hardLimitBytes: PROJECT_SOURCE_MAX_BYTES,
        softLimitBytes: PROJECT_SOURCE_MAX_BYTES,
        directUploadMaxBytes: PROJECT_SOURCE_MAX_BYTES,
        transformBeforeReject: false,
        enforcePreparedSoftLimit: false,
        compressionStrategy: 'none',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(
          policy,
          buildProjectHardLimitMessage(
            params.size,
            policy.hardLimitBytes,
            'Project files',
          ),
        );
      }
      return acceptDecision(
        policy,
        'direct',
        'Uploading project file...',
        null,
      );
    }
    case 'portfolio_thumbnail': {
      const policy = createPolicy({
        policyId: 'portfolio_thumbnail',
        hardLimitBytes: PROJECT_THUMBNAIL_HARD_MAX_BYTES,
        softLimitBytes: PROJECT_THUMBNAIL_MAX_BYTES,
        directUploadMaxBytes: null,
        transformBeforeReject: true,
        enforcePreparedSoftLimit: false,
        compressionStrategy: 'image_derivatives',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(
          policy,
          buildProjectHardLimitMessage(
            params.size,
            policy.hardLimitBytes,
            'Thumbnail images',
          ),
        );
      }
      return acceptDecision(
        policy,
        'optimize',
        'Uploading thumbnail...',
        'Optimizing thumbnail...',
      );
    }
    case 'group_image': {
      const policy = createPolicy({
        policyId: 'group_image',
        hardLimitBytes: SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES,
        softLimitBytes: SHARED_MEDIA_SOFT_LIMIT_BYTES,
        directUploadMaxBytes: null,
        transformBeforeReject: true,
        enforcePreparedSoftLimit: false,
        compressionStrategy: 'image_derivatives',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(
          policy,
          buildImageHardLimitMessage(
            'Group picture',
            params.size,
            policy.hardLimitBytes,
          ),
        );
      }
      return acceptDecision(
        policy,
        'optimize',
        'Uploading group picture...',
        'Preparing group picture...',
      );
    }
  }
}

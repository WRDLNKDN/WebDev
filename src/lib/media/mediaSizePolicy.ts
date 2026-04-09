import type { PlatformUploadSurface } from './uploadSurface';
import {
  CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
  CHAT_GIF_DIRECT_UPLOAD_MAX_FILE_BYTES,
  CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES,
  classifyMimeForMediaPolicy,
  formatResumeOversizeMessage,
  MEDIA_SIZE_REJECTION,
  PROFILE_AVATAR_INPUT_HARD_LIMIT_BYTES,
  PROFILE_AVATAR_OUTPUT_MAX_FILE_BYTES,
  PROFILE_RESUME_INPUT_HARD_LIMIT_BYTES,
  PROFILE_RESUME_THUMBNAIL_INPUT_HARD_LIMIT_BYTES,
  PROFILE_RESUME_THUMBNAIL_OUTPUT_MAX_FILE_BYTES,
  PROJECT_SOURCE_HARD_MAX_BYTES,
  PROJECT_SOURCE_MAX_BYTES,
  PROJECT_THUMBNAIL_HARD_MAX_BYTES,
  PROJECT_THUMBNAIL_MAX_BYTES,
  rejectionAvatarOverHardCap,
  rejectionChatPdfOverHardCap,
  rejectionChatRasterOverHardCap,
  rejectionPortfolioSourceBinaryOverCap,
  rejectionPortfolioTransformableOverCap,
  rejectionResumeThumbnailOverHardCap,
  RESUME_MAX_FILE_BYTES,
  SHARED_MEDIA_SOFT_LIMIT_BYTES,
  SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES,
  type MediaCompressionStrategy,
  type MediaPolicyAssetClass,
  type MediaSizeRejectionCode,
} from './mediaSizePolicyConfig';

export {
  BYTES_PER_KB,
  BYTES_PER_MB,
  CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
  CHAT_GIF_DIRECT_UPLOAD_MAX_FILE_BYTES,
  CHAT_GIF_PROCESSING_MAX_FILE_BYTES,
  CHAT_PROCESSED_MEDIA_MAX_FILE_BYTES,
  classifyMimeForMediaPolicy,
  formatResumeOversizeMessage,
  getResumeSoftSizeNote,
  MB,
  MEDIA_COMPRESSION_DECISION_TREE,
  PLATFORM_UPLOAD_ABSOLUTE_CEILING_BYTES,
  PROFILE_AVATAR_INPUT_HARD_LIMIT_BYTES,
  PROFILE_AVATAR_OUTPUT_MAX_FILE_BYTES,
  PROFILE_RESUME_INPUT_HARD_LIMIT_BYTES,
  PROFILE_RESUME_THUMBNAIL_INPUT_HARD_LIMIT_BYTES,
  PROFILE_RESUME_THUMBNAIL_OUTPUT_MAX_FILE_BYTES,
  PROJECT_SOURCE_HARD_MAX_BYTES,
  PROJECT_SOURCE_MAX_BYTES,
  PROJECT_THUMBNAIL_HARD_MAX_BYTES,
  PROJECT_THUMBNAIL_MAX_BYTES,
  RESUME_MAX_FILE_BYTES,
  RESUME_SOFT_SIZE_WARNING_BYTES,
  RESUME_UPLOAD_ACCESSIBILITY_DESCRIPTION,
  SHARED_MEDIA_SOFT_LIMIT_BYTES,
  SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES,
  STRUCTURED_MEDIA_INPUT_HARD_LIMIT_BYTES,
  type MediaCompressionDecisionTree,
  type MediaCompressionStrategy,
  type MediaPolicyAssetClass,
  type MediaSizeRejectionCode,
} from './mediaSizePolicyConfig';

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
  /** MIME-derived class for telemetry and policy docs. */
  mediaAssetClass: MediaPolicyAssetClass;
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
      rejectionCode: MediaSizeRejectionCode;
      policy: ResolvedUploadSizePolicy;
    };

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
  payload: { code: MediaSizeRejectionCode; message: string },
): UploadSizeDecision {
  return {
    accepted: false,
    reason: payload.message,
    rejectionCode: payload.code,
    policy,
  };
}

export function getUploadSurfaceGuidance(
  surface: PlatformUploadSurface,
): string | null {
  switch (surface) {
    case 'portfolio_source':
      return 'Aim for about 2 MB for the fastest uploads (resize images, convert to JPG or WEBP when helpful, export smaller PDFs). Inputs may start up to 15 MB where optimization applies; delivery often targets around 6 MB.';
    case 'portfolio_thumbnail':
      return 'Optional thumbnails: aim for about 2 MB; larger inputs are optimized when possible (up to 15 MB).';
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
): { code: MediaSizeRejectionCode; message: string } | null {
  if (!policy.enforcePreparedSoftLimit || policy.softLimitBytes == null) {
    return null;
  }
  if (size <= policy.softLimitBytes) return null;

  switch (policy.policyId) {
    case 'profile_avatar':
      return {
        code: 'post_transform_soft_target_not_met',
        message:
          'Avatar is still too large after optimization. Try a smaller or simpler image.',
      };
    case 'profile_resume_pdf':
      return {
        code: 'post_transform_soft_target_not_met',
        message: formatResumeOversizeMessage(size, mimeType),
      };
    case 'profile_resume_thumbnail':
      return {
        code: 'post_transform_soft_target_not_met',
        message:
          'Preview image is still too large after optimization. Try a smaller or simpler image.',
      };
    case 'portfolio_source_pdf':
      return {
        code: 'post_transform_soft_target_not_met',
        message:
          'This PDF is still too large after optimization. Export a smaller PDF and try again.',
      };
    case 'chat_pdf':
      return {
        code: 'post_transform_soft_target_not_met',
        message:
          'This PDF is still too large after optimization. Try a smaller file or compress it first.',
      };
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
  const assetClass = classifyMimeForMediaPolicy(mimeType);
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isProcessedGifVideo =
    mimeType === 'video/mp4' || mimeType === 'video/webm';

  switch (params.surface) {
    case 'feed_post_image': {
      const policy = createPolicy({
        policyId: 'feed_image',
        mediaAssetClass: assetClass,
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
          MEDIA_SIZE_REJECTION.hardCapTransformableMedia({
            subjectLabel: 'Image',
            fileSizeBytes: params.size,
            hardCapBytes: policy.hardLimitBytes,
          }),
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
          mediaAssetClass: 'loop_video',
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
            MEDIA_SIZE_REJECTION.chatTranscodedDeliveryLimit(),
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
          mediaAssetClass: 'animated_gif',
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
            MEDIA_SIZE_REJECTION.chatGifProcessBudget(),
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
          mediaAssetClass: assetClass,
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
            rejectionChatRasterOverHardCap(policy.hardLimitBytes),
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
          mediaAssetClass: 'pdf',
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
            rejectionChatPdfOverHardCap(policy.hardLimitBytes),
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
        mediaAssetClass: assetClass,
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
        return rejectDecision(policy, MEDIA_SIZE_REJECTION.chatGenericSixMb());
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
        mediaAssetClass: 'raster_image',
        hardLimitBytes: PROFILE_AVATAR_INPUT_HARD_LIMIT_BYTES,
        softLimitBytes: PROFILE_AVATAR_OUTPUT_MAX_FILE_BYTES,
        directUploadMaxBytes: null,
        transformBeforeReject: true,
        enforcePreparedSoftLimit: true,
        compressionStrategy: 'avatar_resize',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(policy, rejectionAvatarOverHardCap());
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
          mediaAssetClass: 'pdf',
          hardLimitBytes: PROFILE_RESUME_INPUT_HARD_LIMIT_BYTES,
          softLimitBytes: RESUME_MAX_FILE_BYTES,
          directUploadMaxBytes: CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
          transformBeforeReject: true,
          enforcePreparedSoftLimit: true,
          compressionStrategy: 'pdf_resave',
        });
        if (params.size > policy.hardLimitBytes) {
          return rejectDecision(policy, {
            code: 'hard_cap_transformable_media',
            message: formatResumeOversizeMessage(params.size, mimeType),
          });
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
        mediaAssetClass: 'office_document',
        hardLimitBytes: RESUME_MAX_FILE_BYTES,
        softLimitBytes: RESUME_MAX_FILE_BYTES,
        directUploadMaxBytes: RESUME_MAX_FILE_BYTES,
        transformBeforeReject: false,
        enforcePreparedSoftLimit: false,
        compressionStrategy: 'none',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(policy, {
          code: 'hard_cap_fixed_ceiling_binary',
          message: formatResumeOversizeMessage(params.size, mimeType),
        });
      }
      return acceptDecision(policy, 'direct', 'Uploading resume...', null);
    }
    case 'profile_resume_thumbnail': {
      const policy = createPolicy({
        policyId: 'profile_resume_thumbnail',
        mediaAssetClass: 'raster_image',
        hardLimitBytes: PROFILE_RESUME_THUMBNAIL_INPUT_HARD_LIMIT_BYTES,
        softLimitBytes: PROFILE_RESUME_THUMBNAIL_OUTPUT_MAX_FILE_BYTES,
        directUploadMaxBytes: null,
        transformBeforeReject: true,
        enforcePreparedSoftLimit: true,
        compressionStrategy: 'resume_preview_resize',
      });
      if (params.size > policy.hardLimitBytes) {
        return rejectDecision(policy, rejectionResumeThumbnailOverHardCap());
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
          mediaAssetClass: 'raster_image',
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
            rejectionPortfolioTransformableOverCap(
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
          mediaAssetClass: 'pdf',
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
            rejectionPortfolioTransformableOverCap(
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
        mediaAssetClass: assetClass,
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
          rejectionPortfolioSourceBinaryOverCap(
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
        mediaAssetClass: 'raster_image',
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
          rejectionPortfolioTransformableOverCap(
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
        mediaAssetClass: 'raster_image',
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
          MEDIA_SIZE_REJECTION.hardCapTransformableMedia({
            subjectLabel: 'Group picture',
            fileSizeBytes: params.size,
            hardCapBytes: policy.hardLimitBytes,
          }),
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

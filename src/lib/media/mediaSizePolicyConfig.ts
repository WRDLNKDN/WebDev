/**
 * Central media size policy for UAT/Prod: soft targets, hard caps, transform-first
 * behavior, and stable rejection codes. Import from here for new code; legacy
 * re-exports live in `mediaSizePolicy.ts`.
 */

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = 1024 * BYTES_PER_KB;
export const MB = BYTES_PER_MB;

/** Optimized display / delivery target used across feeds, chat, portfolio, etc. */
export const SHARED_MEDIA_SOFT_LIMIT_BYTES = 6 * MB;

/**
 * Largest input we attempt to transform (resize, re-encode, PDF resave) before hard reject.
 * Aligns with “try optimize first” product rules.
 */
export const SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES = 15 * MB;

/**
 * Single-request ceiling enforced by upload middleware (multer). Not every route uses it;
 * keep client-side checks within this bound when adding new surfaces.
 */
export const PLATFORM_UPLOAD_ABSOLUTE_CEILING_BYTES = 50 * MB;

/** Chat: small files upload as-is; larger ones enter optimize/preview paths where applicable. */
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

/** Stable analytics / telemetry codes; map to copy via `MEDIA_SIZE_REJECTION`. */
export type MediaSizeRejectionCode =
  | 'hard_cap_transformable_media'
  | 'hard_cap_fixed_ceiling_binary'
  | 'chat_gif_input_over_process_budget'
  | 'chat_transcoded_over_delivery_limit'
  | 'post_transform_soft_target_not_met'
  | 'unsupported_file_type';

export type MediaPolicyAssetClass =
  | 'raster_image'
  | 'pdf'
  | 'animated_gif'
  | 'loop_video'
  | 'office_document'
  | 'presentation'
  | 'spreadsheet'
  | 'text_markup'
  | 'video'
  | 'other';

/**
 * MIME-only classification for telemetry and policy docs (surface refines behavior).
 */
export function classifyMimeForMediaPolicy(
  mimeType: string,
): MediaPolicyAssetClass {
  const m = mimeType.toLowerCase().trim();
  if (m === 'image/gif') return 'animated_gif';
  if (m.startsWith('image/')) return 'raster_image';
  if (m === 'application/pdf') return 'pdf';
  if (m === 'video/mp4' || m === 'video/webm' || m === 'video/quicktime') {
    return 'video';
  }
  if (
    m === 'application/msword' ||
    m ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'office_document';
  }
  if (
    m === 'application/vnd.ms-powerpoint' ||
    m ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'presentation';
  }
  if (
    m === 'application/vnd.ms-excel' ||
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'spreadsheet';
  }
  if (m === 'text/plain' || m === 'text/markdown') return 'text_markup';
  return 'other';
}

function formatBytesAsMegabytes(
  bytes: number,
  options?: { compact?: boolean; precision?: number },
): string {
  const precision = options?.precision ?? (bytes >= 10 * MB ? 0 : 1);
  const label = (bytes / MB).toFixed(precision);
  return options?.compact ? `${label}MB` : `${label} MB`;
}

type RejectionPayload = { code: MediaSizeRejectionCode; message: string };

export const MEDIA_SIZE_REJECTION = {
  hardCapTransformableMedia(params: {
    subjectLabel: string;
    fileSizeBytes: number;
    hardCapBytes: number;
  }): RejectionPayload {
    return {
      code: 'hard_cap_transformable_media',
      message: `${params.subjectLabel} is too large (${formatBytesAsMegabytes(params.fileSizeBytes)}). We can optimize images and similar files up to ${formatBytesAsMegabytes(params.hardCapBytes)}.`,
    };
  },

  hardCapFixedCeilingBinary(params: {
    contextLabel: string;
    fileSizeBytes: number;
    hardCapBytes: number;
    hint?: string;
  }): RejectionPayload {
    const hint =
      params.hint ?? 'Try a smaller file or compress it before uploading.';
    return {
      code: 'hard_cap_fixed_ceiling_binary',
      message: `${params.contextLabel} is too large (${formatBytesAsMegabytes(params.fileSizeBytes)}). ${hint} Max size for this type is ${formatBytesAsMegabytes(params.hardCapBytes)}.`,
    };
  },

  chatGifProcessBudget(): RejectionPayload {
    return {
      code: 'chat_gif_input_over_process_budget',
      message: 'This GIF is too large to process. Try a smaller file.',
    };
  },

  chatTranscodedDeliveryLimit(): RejectionPayload {
    return {
      code: 'chat_transcoded_over_delivery_limit',
      message: 'This GIF is too large to process. Try a smaller file.',
    };
  },

  chatGenericSixMb(): RejectionPayload {
    return {
      code: 'hard_cap_fixed_ceiling_binary',
      message: 'This file is too large to process. Try a file under 6 MB.',
    };
  },
} as const;

export function rejectionChatRasterOverHardCap(
  hardLimitBytes: number,
): RejectionPayload {
  return {
    code: 'hard_cap_transformable_media',
    message: `This image is too large to optimize. Try one under ${formatBytesAsMegabytes(hardLimitBytes)}.`,
  };
}

export function rejectionChatPdfOverHardCap(
  hardLimitBytes: number,
): RejectionPayload {
  return {
    code: 'hard_cap_transformable_media',
    message: `This PDF is too large to optimize. Try one under ${formatBytesAsMegabytes(hardLimitBytes)}.`,
  };
}

export function rejectionAvatarOverHardCap(): RejectionPayload {
  return {
    code: 'hard_cap_transformable_media',
    message:
      'Avatar image is too large. We can optimize avatar images up to 15 MB.',
  };
}

export function rejectionResumeThumbnailOverHardCap(): RejectionPayload {
  return {
    code: 'hard_cap_transformable_media',
    message:
      'Preview image is too large. We can optimize preview images up to 15 MB.',
  };
}

export function rejectionPortfolioSourceBinaryOverCap(
  bytes: number,
  hardLimitBytes: number,
  subject: string,
): RejectionPayload {
  return {
    code: 'hard_cap_fixed_ceiling_binary',
    message: buildProjectHardLimitMessage(bytes, hardLimitBytes, subject),
  };
}

export function rejectionPortfolioTransformableOverCap(
  bytes: number,
  hardLimitBytes: number,
  subject: string,
): RejectionPayload {
  return {
    code: 'hard_cap_transformable_media',
    message: buildProjectHardLimitMessage(bytes, hardLimitBytes, subject),
  };
}

export function buildProjectHardLimitMessage(
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

/**
 * Human-readable compression / transform pipeline by asset class. Used for UX copy,
 * support docs, and observability (same semantics as runtime branches in upload intake).
 */
export const MEDIA_COMPRESSION_DECISION_TREE = {
  version: 1 as const,
  absoluteCeilingBytes: PLATFORM_UPLOAD_ABSOLUTE_CEILING_BYTES,
  softTargetBytes: SHARED_MEDIA_SOFT_LIMIT_BYTES,
  transformInputCeilingBytes: SHARED_TRANSFORMABLE_INPUT_HARD_LIMIT_BYTES,
  chatDirectUploadMaxBytes: CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
  byAssetClass: {
    raster_image: {
      transformBeforeReject: true,
      order: [
        'if_size_within_direct_chat_threshold_and_chat_surface_then_strip_exif_only',
        'else_if_under_transform_input_ceiling_resize_long_edge_and_reencode_to_soft_target',
        'reject_if_input_exceeds_transform_input_ceiling',
        'if_after_transform_still_over_soft_target_where_enforced_fail_with_guidance',
      ],
    },
    pdf: {
      transformBeforeReject: true,
      order: [
        'if_under_hard_cap_attempt_client_pdf_resave',
        'reject_if_input_over_hard_cap',
        'if_prepared_file_still_over_soft_ceiling_fail_with_compress_guidance',
      ],
    },
    animated_gif: {
      transformBeforeReject: true,
      order: [
        'if_small_enough_upload_direct',
        'else_if_under_gif_process_budget_server_transcode_to_loop_video',
        'reject_if_over_gif_process_budget',
      ],
    },
    loop_video: {
      transformBeforeReject: false,
      order: ['delivery_must_fit_processed_media_cap'],
    },
    office_document: {
      transformBeforeReject: true,
      order: [
        'preview_generation_when_over_chat_direct_threshold',
        'hard_cap_at_processed_media_max',
      ],
    },
    video: {
      transformBeforeReject: false,
      order: ['no_auto_transcode_hard_cap_at_project_non_image_ceiling'],
    },
    other: {
      transformBeforeReject: false,
      order: ['binary_hard_cap_without_generic_compression'],
    },
  },
} as const;

export type MediaCompressionDecisionTree =
  typeof MEDIA_COMPRESSION_DECISION_TREE;

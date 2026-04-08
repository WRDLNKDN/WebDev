import { CHAT_ALLOWED_EXTENSIONS, CHAT_ALLOWED_MIME } from '../../types/chat';
import { tryOptimizePdfForUpload } from '../portfolio/optimizePdfForUpload';
import { processResumeThumbnailImageForUpload } from '../portfolio/processResumeThumbnailImage';
import { processAvatarForUpload } from '../utils/avatarResize';
import {
  SUPPORTED_DOCUMENT_EXTENSIONS,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_PRESENTATION_EXTENSIONS,
  SUPPORTED_SPREADSHEET_EXTENSIONS,
  SUPPORTED_TEXT_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from '../portfolio/linkUtils';
import type { MediaStatusDiagnostics, SharedMediaUiStage } from './mediaStatus';
import {
  classifyMimeForMediaPolicy,
  getPreparedUploadLimitFailure,
  getUploadSizeDecision,
  type MediaSizeRejectionCode,
  type ResolvedUploadSizePolicy,
} from './mediaSizePolicy';
import { reportMediaTelemetryAsync } from './telemetry';
import type { PlatformUploadSurface } from './uploadSurface';

export { PLATFORM_UPLOAD_SURFACES } from './uploadSurface';
export type { PlatformUploadSurface } from './uploadSurface';

export type SharedUploadPlan =
  | {
      accepted: true;
      surface: PlatformUploadSurface;
      detectedMimeType: string;
      mode: 'direct' | 'optimize' | 'gif_processing';
      uploadLabel: string;
      helperText: string | null;
      policy: ResolvedUploadSizePolicy;
    }
  | {
      accepted: false;
      surface: PlatformUploadSurface;
      detectedMimeType: string | null;
      reason: string;
      rejectionCode: MediaSizeRejectionCode;
    };

export type SharedUploadState =
  | {
      status: 'validating' | 'preparing' | 'uploading' | 'processing' | 'ready';
      stage: Exclude<SharedMediaUiStage, 'failed'>;
      message: string | null;
      fingerprint: string;
      surface: PlatformUploadSurface;
      retryable: false;
      diagnostics: MediaStatusDiagnostics;
    }
  | {
      status: 'failed';
      stage: 'failed';
      message: string;
      fingerprint: string;
      surface: PlatformUploadSurface;
      retryable: boolean;
      diagnostics: MediaStatusDiagnostics;
    };

export type PreparedSharedUpload = {
  file: File;
  detectedMimeType: string;
  fingerprint: string;
  plan: Extract<SharedUploadPlan, { accepted: true }>;
};

type UploadDescriptor = {
  name?: string;
  size?: number;
  type?: string | null;
};

type UploadSurfacePolicy = {
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
  unsupportedTypeMessage: string;
};

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'] as const;
const GROUP_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
const GROUP_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
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
const PROJECT_FILE_EXTENSIONS = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
  ...SUPPORTED_PRESENTATION_EXTENSIONS,
  ...SUPPORTED_SPREADSHEET_EXTENSIONS,
  ...SUPPORTED_TEXT_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS,
].map((ext) => `.${ext}`);

const DUPLICATE_UPLOAD_MESSAGE =
  'This file is already uploading. Wait a moment and try again.';

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

const inFlightUploads = new Set<string>();

function getFileExtension(name: string | undefined): string {
  if (typeof name !== 'string' || !name.trim()) return '';
  const lower = name.toLowerCase().trim();
  const lastDot = lower.lastIndexOf('.');
  return lastDot >= 0 ? lower.slice(lastDot) : '';
}

export function normalizeUploadMimeFromMetadata(
  file: UploadDescriptor,
): string | null {
  const rawType = file.type?.toLowerCase().trim() ?? '';
  if (rawType) return rawType;
  return EXTENSION_TO_MIME[getFileExtension(file.name)] ?? null;
}

const uploadPolicies: Record<PlatformUploadSurface, UploadSurfacePolicy> = {
  feed_post_image: {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
    unsupportedTypeMessage: 'Only JPG, PNG, GIF, and WebP images are allowed.',
  },
  chat_attachment: {
    allowedMimeTypes: [...CHAT_ALLOWED_MIME, 'video/mp4', 'video/webm'],
    allowedExtensions: CHAT_ALLOWED_EXTENSIONS,
    unsupportedTypeMessage:
      'Unsupported type. Allowed: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX, TXT.',
  },
  profile_avatar: {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
    unsupportedTypeMessage: 'Avatar must be JPEG, PNG, GIF, or WebP.',
  },
  profile_resume: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    unsupportedTypeMessage:
      'Resume must be a PDF or Word document (.pdf, .doc, or .docx only)',
  },
  profile_resume_thumbnail: {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
    unsupportedTypeMessage: 'Preview image must be JPEG, PNG, WebP, or GIF.',
  },
  portfolio_source: {
    allowedMimeTypes: [
      ...IMAGE_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
      ...VIDEO_MIME_TYPES,
    ],
    allowedExtensions: PROJECT_FILE_EXTENSIONS,
    unsupportedTypeMessage:
      'Project files must be JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MP4, WEBM, or MOV.',
  },
  portfolio_thumbnail: {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
    unsupportedTypeMessage:
      'Optional thumbnails must be PNG, JPG, GIF, or WEBP images.',
  },
  group_image: {
    allowedMimeTypes: GROUP_IMAGE_MIME_TYPES,
    allowedExtensions: GROUP_IMAGE_EXTENSIONS,
    unsupportedTypeMessage: 'Group picture must be a PNG, JPG, or WebP image.',
  },
};

function resolvePolicy(surface: PlatformUploadSurface): UploadSurfacePolicy {
  return uploadPolicies[surface];
}

function planFromDescriptor(
  surface: PlatformUploadSurface,
  descriptor: UploadDescriptor,
  mimeType: string | null,
): SharedUploadPlan {
  const policy = resolvePolicy(surface);
  const detectedMimeType = mimeType?.toLowerCase().trim() ?? null;
  const extension = getFileExtension(descriptor.name);
  const isAllowed =
    (detectedMimeType != null &&
      policy.allowedMimeTypes.includes(detectedMimeType)) ||
    policy.allowedExtensions.includes(extension);

  if (!isAllowed || !detectedMimeType) {
    return {
      accepted: false,
      surface,
      detectedMimeType,
      reason: policy.unsupportedTypeMessage,
      rejectionCode: 'unsupported_file_type',
    };
  }

  const sizeDecision = getUploadSizeDecision({
    surface,
    size: descriptor.size ?? 0,
    mimeType: detectedMimeType,
  });
  if (!sizeDecision.accepted) {
    return {
      accepted: false,
      surface,
      detectedMimeType,
      reason: sizeDecision.reason,
      rejectionCode: sizeDecision.rejectionCode,
    };
  }

  return {
    surface,
    detectedMimeType,
    ...sizeDecision,
  };
}

export function getSharedUploadPlanFromDescriptor(
  surface: PlatformUploadSurface,
  descriptor: UploadDescriptor,
): SharedUploadPlan {
  return planFromDescriptor(
    surface,
    descriptor,
    normalizeUploadMimeFromMetadata(descriptor),
  );
}

export function getSharedUploadRejectionReason(
  surface: PlatformUploadSurface,
  descriptor: UploadDescriptor,
): string | null {
  const plan = getSharedUploadPlanFromDescriptor(surface, descriptor);
  return plan.accepted ? null : plan.reason;
}

function hasBytePrefix(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((value, index) => bytes[index] === value);
}

function bytesToAscii(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => String.fromCharCode(value))
    .join('');
}

export async function detectUploadMime(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());

  if (hasBytePrefix(header, [0x25, 0x50, 0x44, 0x46])) {
    return 'application/pdf';
  }
  if (hasBytePrefix(header, [0x89, 0x50, 0x4e, 0x47])) {
    return 'image/png';
  }
  if (hasBytePrefix(header, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (bytesToAscii(header.slice(0, 6)).startsWith('GIF8')) {
    return 'image/gif';
  }
  if (
    bytesToAscii(header.slice(0, 4)) === 'RIFF' &&
    bytesToAscii(header.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (bytesToAscii(header.slice(4, 8)).startsWith('ftyp')) {
    const brand = bytesToAscii(header.slice(8, 12)).toLowerCase();
    if (brand.startsWith('qt')) return 'video/quicktime';
    return 'video/mp4';
  }
  if (hasBytePrefix(header, [0x1a, 0x45, 0xdf, 0xa3])) {
    return 'video/webm';
  }
  if (hasBytePrefix(header, [0xd0, 0xcf, 0x11, 0xe0])) {
    return 'application/msword';
  }

  const metadataMime = normalizeUploadMimeFromMetadata(file);
  return metadataMime;
}

function buildUploadFingerprint(file: File, mimeType: string): string {
  return [
    file.name.trim().toLowerCase(),
    file.size,
    file.lastModified,
    mimeType,
  ].join(':');
}

function withPreparedMime(file: File, mimeType: string): File {
  if (file.type === mimeType) return file;
  return new File([file], file.name, {
    type: mimeType,
    lastModified: file.lastModified,
  });
}

function createFileFromBlob(
  file: File,
  blob: Blob,
  nameOverride?: string,
): File {
  return new File([blob], nameOverride ?? file.name, {
    type: blob.type || file.type,
    lastModified: Date.now(),
  });
}

async function prepareUploadForSurface(
  surface: PlatformUploadSurface,
  file: File,
  detectedMimeType: string,
): Promise<File> {
  switch (surface) {
    case 'profile_avatar': {
      const { blob } = await processAvatarForUpload(file);
      return createFileFromBlob(file, blob);
    }
    case 'chat_attachment': {
      if (detectedMimeType !== 'application/pdf') {
        return withPreparedMime(file, detectedMimeType);
      }
      return await tryOptimizePdfForUpload(
        withPreparedMime(file, detectedMimeType),
      );
    }
    case 'profile_resume': {
      if (detectedMimeType !== 'application/pdf')
        return withPreparedMime(file, detectedMimeType);
      return await tryOptimizePdfForUpload(
        withPreparedMime(file, detectedMimeType),
      );
    }
    case 'profile_resume_thumbnail': {
      const blob = await processResumeThumbnailImageForUpload(file);
      const extension = '.jpg';
      const nextName = file.name.replace(/\.[^.]+$/, '') || 'resume-preview';
      return createFileFromBlob(file, blob, `${nextName}${extension}`);
    }
    case 'portfolio_source': {
      if (detectedMimeType !== 'application/pdf')
        return withPreparedMime(file, detectedMimeType);
      return await tryOptimizePdfForUpload(
        withPreparedMime(file, detectedMimeType),
      );
    }
    default:
      return withPreparedMime(file, detectedMimeType);
  }
}

export async function getSharedUploadPlan(
  surface: PlatformUploadSurface,
  file: File,
): Promise<SharedUploadPlan> {
  const detectedMimeType = await detectUploadMime(file);
  return planFromDescriptor(surface, file, detectedMimeType);
}

function claimUploadFingerprint(fingerprint: string): void {
  if (inFlightUploads.has(fingerprint)) {
    throw new Error(DUPLICATE_UPLOAD_MESSAGE);
  }
  inFlightUploads.add(fingerprint);
}

function releaseUploadFingerprint(fingerprint: string): void {
  inFlightUploads.delete(fingerprint);
}

function buildUploadDiagnostics(params: {
  surface: PlatformUploadSurface;
  fingerprint: string;
  mimeType?: string | null;
  code?: string | null;
}): MediaStatusDiagnostics {
  return {
    id: params.fingerprint,
    surface: params.surface,
    mimeType: params.mimeType ?? null,
    code: params.code ?? null,
  };
}

function createSharedUploadState(
  params: {
    surface: PlatformUploadSurface;
    fingerprint: string;
    message: string | null;
    retryable?: boolean;
    mimeType?: string | null;
    code?: string | null;
  } & (
    | {
        status: 'failed';
        stage: 'failed';
      }
    | {
        status:
          | 'validating'
          | 'preparing'
          | 'uploading'
          | 'processing'
          | 'ready';
        stage: Exclude<SharedMediaUiStage, 'failed'>;
      }
  ),
): SharedUploadState {
  const diagnostics = buildUploadDiagnostics({
    surface: params.surface,
    fingerprint: params.fingerprint,
    mimeType: params.mimeType,
    code: params.code,
  });

  if (params.status === 'failed') {
    return {
      status: 'failed',
      stage: 'failed',
      message: params.message ?? 'Upload failed. Please try again.',
      fingerprint: params.fingerprint,
      surface: params.surface,
      retryable: params.retryable ?? true,
      diagnostics,
    };
  }

  return {
    status: params.status,
    stage: params.stage,
    message: params.message,
    fingerprint: params.fingerprint,
    surface: params.surface,
    retryable: false,
    diagnostics,
  };
}

function getPreparationStage(
  plan: Extract<SharedUploadPlan, { accepted: true }>,
): Exclude<SharedMediaUiStage, 'failed' | 'ready'> {
  if (plan.mode === 'optimize') return 'optimizing';
  if (plan.mode === 'gif_processing') return 'converting';
  return 'uploading';
}

function getExecutionStage(
  plan: Extract<SharedUploadPlan, { accepted: true }>,
): Exclude<SharedMediaUiStage, 'failed' | 'ready' | 'validating'> {
  if (plan.mode === 'gif_processing') return 'converting';
  return 'uploading';
}

function toTelemetryStage(
  stage: SharedMediaUiStage,
): 'validation' | 'upload' | 'optimization' | 'conversion' {
  switch (stage) {
    case 'validating':
      return 'validation';
    case 'optimizing':
      return 'optimization';
    case 'converting':
      return 'conversion';
    default:
      return 'upload';
  }
}

function trackUploadIntakeTelemetry(params: {
  eventName: string;
  stage: SharedMediaUiStage;
  surface: PlatformUploadSurface;
  requestId: string;
  mimeType?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  status?: string | null;
  rejectionCode?: MediaSizeRejectionCode | null;
  mediaAssetClass?: string | null;
  meta?: Record<string, unknown>;
}) {
  reportMediaTelemetryAsync({
    eventName: params.eventName,
    stage: toTelemetryStage(params.stage),
    surface: params.surface,
    requestId: params.requestId,
    pipeline: 'upload_intake',
    status: params.status,
    failureCode: params.failureCode,
    failureReason: params.failureReason,
    meta: {
      mimeType: params.mimeType ?? null,
      rejectionCode: params.rejectionCode ?? null,
      mediaAssetClass: params.mediaAssetClass ?? null,
      ...params.meta,
    },
  });
}

function trackCompressionTelemetry(params: {
  eventName: string;
  plan: Extract<SharedUploadPlan, { accepted: true }>;
  surface: PlatformUploadSurface;
  requestId: string;
  mimeType: string;
  inputBytes: number;
  outputBytes?: number;
  failureReason?: string | null;
  status?: string | null;
}) {
  if (params.plan.policy.compressionStrategy === 'none') {
    return;
  }

  const telemetryStage =
    params.plan.mode === 'gif_processing' ? 'converting' : 'optimizing';
  const outputBytes = params.outputBytes ?? null;
  let compressionOutcome: string | null;
  if (params.status === 'failed') {
    compressionOutcome = 'failed';
  } else if (params.status === 'ready') {
    compressionOutcome = 'succeeded';
  } else {
    compressionOutcome = params.status ?? null;
  }
  trackUploadIntakeTelemetry({
    eventName: params.eventName,
    stage: telemetryStage,
    surface: params.surface,
    requestId: params.requestId,
    mimeType: params.mimeType,
    mediaAssetClass: params.plan.policy.mediaAssetClass,
    status: params.status,
    failureCode: params.status === 'failed' ? 'compression_failed' : undefined,
    failureReason: params.failureReason ?? undefined,
    meta: {
      policyId: params.plan.policy.policyId,
      compressionStrategy: params.plan.policy.compressionStrategy,
      transformBeforeReject: params.plan.policy.transformBeforeReject,
      softLimitBytes: params.plan.policy.softLimitBytes,
      hardLimitBytes: params.plan.policy.hardLimitBytes,
      directUploadMaxBytes: params.plan.policy.directUploadMaxBytes,
      inputBytes: params.inputBytes,
      outputBytes,
      compressionOutcome,
      bytesSaved:
        outputBytes == null
          ? null
          : Math.max(0, params.inputBytes - outputBytes),
    },
  });
}

export async function runSharedUploadIntake<T>(params: {
  surface: PlatformUploadSurface;
  file: File;
  onStateChange?: (state: SharedUploadState) => void;
  executeUpload: (prepared: PreparedSharedUpload) => Promise<T>;
}): Promise<T> {
  const initialMime =
    (await detectUploadMime(params.file)) ?? 'application/octet-stream';
  const fingerprint = buildUploadFingerprint(params.file, initialMime);

  params.onStateChange?.(
    createSharedUploadState({
      surface: params.surface,
      status: 'validating',
      stage: 'validating',
      message: 'Checking file before upload...',
      fingerprint,
      mimeType: initialMime,
    }),
  );
  trackUploadIntakeTelemetry({
    eventName: 'media_intake_validation_started',
    stage: 'validating',
    surface: params.surface,
    requestId: fingerprint,
    mimeType: initialMime,
    mediaAssetClass: classifyMimeForMediaPolicy(initialMime),
    status: 'started',
  });

  const initialPlan = planFromDescriptor(
    params.surface,
    params.file,
    initialMime,
  );
  if (!initialPlan.accepted) {
    params.onStateChange?.(
      createSharedUploadState({
        surface: params.surface,
        status: 'failed',
        stage: 'failed',
        message: initialPlan.reason,
        fingerprint,
        mimeType: initialMime,
        retryable: false,
        code: 'validation_failed',
      }),
    );
    trackUploadIntakeTelemetry({
      eventName: 'media_intake_validation_failed',
      stage: 'validating',
      surface: params.surface,
      requestId: fingerprint,
      mimeType: initialMime,
      mediaAssetClass: classifyMimeForMediaPolicy(initialMime),
      status: 'failed',
      failureCode: 'validation_failed',
      failureReason: initialPlan.reason,
      rejectionCode: initialPlan.rejectionCode,
    });
    throw new Error(initialPlan.reason);
  }

  claimUploadFingerprint(fingerprint);

  try {
    params.onStateChange?.(
      createSharedUploadState({
        surface: params.surface,
        status: 'preparing',
        stage: getPreparationStage(initialPlan),
        message:
          initialPlan.helperText ??
          (initialPlan.mode === 'optimize'
            ? 'Optimizing media before upload...'
            : initialPlan.mode === 'gif_processing'
              ? 'Converting media into a lighter playback format...'
              : initialPlan.uploadLabel),
        fingerprint,
        mimeType: initialPlan.detectedMimeType,
      }),
    );
    trackUploadIntakeTelemetry({
      eventName: 'media_intake_preparing',
      stage: getPreparationStage(initialPlan),
      surface: params.surface,
      requestId: fingerprint,
      mimeType: initialPlan.detectedMimeType,
      mediaAssetClass: initialPlan.policy.mediaAssetClass,
      status: 'started',
      meta: {
        mode: initialPlan.mode,
        policyId: initialPlan.policy.policyId,
        compressionStrategy: initialPlan.policy.compressionStrategy,
        softLimitBytes: initialPlan.policy.softLimitBytes,
        hardLimitBytes: initialPlan.policy.hardLimitBytes,
        directUploadMaxBytes: initialPlan.policy.directUploadMaxBytes,
      },
    });

    let preparedFile: File;
    try {
      preparedFile = await prepareUploadForSurface(
        params.surface,
        params.file,
        initialPlan.detectedMimeType,
      );
      trackCompressionTelemetry({
        eventName: 'media_intake_compression_succeeded',
        plan: initialPlan,
        surface: params.surface,
        requestId: fingerprint,
        mimeType: initialPlan.detectedMimeType,
        inputBytes: params.file.size,
        outputBytes: preparedFile.size,
        status: 'ready',
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Upload failed. Please try again.';
      trackCompressionTelemetry({
        eventName: 'media_intake_compression_failed',
        plan: initialPlan,
        surface: params.surface,
        requestId: fingerprint,
        mimeType: initialPlan.detectedMimeType,
        inputBytes: params.file.size,
        failureReason: message,
        status: 'failed',
      });
      throw error;
    }
    const preparedMime =
      (await detectUploadMime(preparedFile)) ?? initialPlan.detectedMimeType;
    const preparedPlan = planFromDescriptor(
      params.surface,
      preparedFile,
      preparedMime,
    );
    if (!preparedPlan.accepted) {
      params.onStateChange?.(
        createSharedUploadState({
          surface: params.surface,
          status: 'failed',
          stage: 'failed',
          message: preparedPlan.reason,
          fingerprint,
          mimeType: preparedMime,
          retryable: false,
          code: 'validation_failed',
        }),
      );
      trackUploadIntakeTelemetry({
        eventName: 'media_intake_prepared_validation_failed',
        stage: 'validating',
        surface: params.surface,
        requestId: fingerprint,
        mimeType: preparedMime,
        mediaAssetClass: classifyMimeForMediaPolicy(preparedMime),
        status: 'failed',
        failureCode: 'validation_failed',
        failureReason: preparedPlan.reason,
        rejectionCode: preparedPlan.rejectionCode,
      });
      throw new Error(preparedPlan.reason);
    }

    const preparedLimitFailure = getPreparedUploadLimitFailure(
      preparedPlan.policy,
      preparedFile.size,
      preparedMime,
    );
    if (preparedLimitFailure) {
      params.onStateChange?.(
        createSharedUploadState({
          surface: params.surface,
          status: 'failed',
          stage: 'failed',
          message: preparedLimitFailure.message,
          fingerprint,
          mimeType: preparedMime,
          retryable: false,
          code: 'prepared_size_limit_exceeded',
        }),
      );
      trackUploadIntakeTelemetry({
        eventName: 'media_intake_prepared_validation_failed',
        stage: 'validating',
        surface: params.surface,
        requestId: fingerprint,
        mimeType: preparedMime,
        mediaAssetClass: preparedPlan.policy.mediaAssetClass,
        status: 'failed',
        failureCode: 'prepared_size_limit_exceeded',
        failureReason: preparedLimitFailure.message,
        rejectionCode: preparedLimitFailure.code,
        meta: {
          policyId: preparedPlan.policy.policyId,
          compressionStrategy: preparedPlan.policy.compressionStrategy,
          inputBytes: params.file.size,
          outputBytes: preparedFile.size,
          softLimitBytes: preparedPlan.policy.softLimitBytes,
        },
      });
      throw new Error(preparedLimitFailure.message);
    }

    let intakeMessage: string;
    if (preparedPlan.mode === 'direct') {
      intakeMessage = preparedPlan.uploadLabel;
    } else {
      intakeMessage = preparedPlan.helperText ?? preparedPlan.uploadLabel;
    }
    params.onStateChange?.(
      createSharedUploadState({
        surface: params.surface,
        status: preparedPlan.mode === 'direct' ? 'uploading' : 'processing',
        stage: getExecutionStage(preparedPlan),
        message: intakeMessage,
        fingerprint,
        mimeType: preparedMime,
      }),
    );
    trackUploadIntakeTelemetry({
      eventName: 'media_intake_upload_started',
      stage: getExecutionStage(preparedPlan),
      surface: params.surface,
      requestId: fingerprint,
      mimeType: preparedMime,
      mediaAssetClass: preparedPlan.policy.mediaAssetClass,
      status: 'started',
      meta: {
        mode: preparedPlan.mode,
        policyId: preparedPlan.policy.policyId,
        compressionStrategy: preparedPlan.policy.compressionStrategy,
      },
    });

    const result = await params.executeUpload({
      file: preparedFile,
      detectedMimeType: preparedMime,
      fingerprint,
      plan: preparedPlan,
    });

    params.onStateChange?.(
      createSharedUploadState({
        surface: params.surface,
        status: 'ready',
        stage: 'ready',
        message: 'Media ready.',
        fingerprint,
        mimeType: preparedMime,
      }),
    );
    trackUploadIntakeTelemetry({
      eventName: 'media_intake_ready',
      stage: 'ready',
      surface: params.surface,
      requestId: fingerprint,
      mimeType: preparedMime,
      mediaAssetClass: preparedPlan.policy.mediaAssetClass,
      status: 'ready',
      meta: {
        mode: preparedPlan.mode,
        policyId: preparedPlan.policy.policyId,
        compressionStrategy: preparedPlan.policy.compressionStrategy,
      },
    });
    return result;
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Upload failed. Please try again.';
    params.onStateChange?.(
      createSharedUploadState({
        surface: params.surface,
        status: 'failed',
        stage: 'failed',
        message,
        fingerprint,
        mimeType: initialMime,
        retryable: message !== DUPLICATE_UPLOAD_MESSAGE,
        code: 'upload_failed',
      }),
    );
    trackUploadIntakeTelemetry({
      eventName: 'media_intake_failed',
      stage: 'uploading',
      surface: params.surface,
      requestId: fingerprint,
      mimeType: initialMime,
      status: 'failed',
      failureCode: 'upload_failed',
      failureReason: message,
    });
    throw error instanceof Error ? error : new Error(message);
  } finally {
    releaseUploadFingerprint(fingerprint);
  }
}

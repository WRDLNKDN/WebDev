export const PLATFORM_MEDIA_SOURCE_TYPES = [
  'upload',
  'link',
  'gif_provider',
  'generated',
] as const;

export const PLATFORM_MEDIA_TYPES = [
  'image',
  'video',
  'doc',
  'gif',
  'link',
] as const;

export const PLATFORM_MEDIA_PROCESSING_STATES = [
  'pending',
  'uploading',
  'processing',
  'ready',
  'failed',
  'deleted',
] as const;

export const PLATFORM_MEDIA_MODERATION_STATUSES = [
  'unreviewed',
  'pending_review',
  'approved',
  'reported',
  'quarantined',
] as const;

export const PLATFORM_MEDIA_SAFETY_HOOK_STATUSES = [
  'not_run',
  'pending',
  'passed',
  'review',
  'blocked',
  'error',
] as const;

export const PLATFORM_MEDIA_DERIVATIVE_KINDS = [
  'original',
  'display',
  'thumbnail',
] as const;

export const PLATFORM_MEDIA_DELIVERY_VISIBILITIES = [
  'public',
  'signed',
  'private',
] as const;

export const PLATFORM_MEDIA_CACHE_PROFILES = [
  'immutable',
  'revalidate',
  'signed_short',
  'no_store',
] as const;

export const PLATFORM_MEDIA_LIFECYCLE_STATES = [
  'active',
  'orphaned',
  'failed_retained',
  'pending_delete',
  'deleted',
] as const;

export const PLATFORM_MEDIA_REPROCESS_STATES = [
  'idle',
  'queued',
  'processing',
  'complete',
  'failed',
] as const;

export type PlatformMediaSourceType =
  (typeof PLATFORM_MEDIA_SOURCE_TYPES)[number];
export type PlatformMediaType = (typeof PLATFORM_MEDIA_TYPES)[number];
export type PlatformMediaProcessingState =
  (typeof PLATFORM_MEDIA_PROCESSING_STATES)[number];
export type PlatformMediaModerationStatus =
  (typeof PLATFORM_MEDIA_MODERATION_STATUSES)[number];
export type PlatformMediaSafetyHookStatus =
  (typeof PLATFORM_MEDIA_SAFETY_HOOK_STATUSES)[number];
export type PlatformMediaDerivativeKind =
  (typeof PLATFORM_MEDIA_DERIVATIVE_KINDS)[number];
export type PlatformMediaDeliveryVisibility =
  (typeof PLATFORM_MEDIA_DELIVERY_VISIBILITIES)[number];
export type PlatformMediaCacheProfile =
  (typeof PLATFORM_MEDIA_CACHE_PROFILES)[number];
export type PlatformMediaLifecycleState =
  (typeof PLATFORM_MEDIA_LIFECYCLE_STATES)[number];
export type PlatformMediaReprocessState =
  (typeof PLATFORM_MEDIA_REPROCESS_STATES)[number];

export type PlatformMediaSourceReference = {
  provider?: string | null;
  externalUrl?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
};

export type PlatformMediaDerivativeReference = {
  kind: PlatformMediaDerivativeKind;
  url?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sizeBytes?: number | null;
};

export type PlatformMediaDerivatives = {
  original?: PlatformMediaDerivativeReference | null;
  display?: PlatformMediaDerivativeReference | null;
  thumbnail?: PlatformMediaDerivativeReference | null;
};

export type PlatformMediaRenderingReferences = {
  originalUrl: string | null;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  primaryUrl: string | null;
  previewUrl: string | null;
  posterUrl: string | null;
  downloadUrl: string | null;
};

export type PlatformMediaDeliveryVariantPolicy = {
  kind: PlatformMediaDerivativeKind;
  visibility: PlatformMediaDeliveryVisibility;
  cacheProfile: PlatformMediaCacheProfile;
  cacheControl: string;
  signedUrlTtlSeconds?: number | null;
  invalidationToken?: string | null;
};

export type PlatformMediaDeliveryMetadata = {
  storagePrefix?: string | null;
  storageVersion: number;
  invalidationToken?: string | null;
  original: PlatformMediaDeliveryVariantPolicy | null;
  display: PlatformMediaDeliveryVariantPolicy | null;
  thumbnail: PlatformMediaDeliveryVariantPolicy | null;
};

export type PlatformMediaFallbackMetadata = {
  strategy?: string | null;
  reason?: string | null;
  label?: string | null;
  thumbnailUrl?: string | null;
};

export type PlatformMediaFailureMetadata = {
  code?: string | null;
  reason?: string | null;
  detail?: string | null;
  stage?: string | null;
  retryable?: boolean;
  failedAt?: string | null;
};

export type PlatformMediaAbuseReportReference = {
  reportId?: string | null;
  reportType?: string | null;
  queueId?: string | null;
  url?: string | null;
  status?: string | null;
  reportedAt?: string | null;
  reason?: string | null;
};

export type PlatformMediaModerationMetadata = {
  source?: string | null;
  safeToRender?: boolean;
  quarantinedAt?: string | null;
  reviewedAt?: string | null;
  reason?: string | null;
  unsafeReasons?: string[] | null;
  provider?: string | null;
  hookStatus?: PlatformMediaSafetyHookStatus | null;
  providerReference?: string | null;
  note?: string | null;
  abuseReport?: PlatformMediaAbuseReportReference | null;
  meta?: Record<string, unknown> | null;
};

export type PlatformMediaLifecycleMetadata = {
  cleanupState?: PlatformMediaLifecycleState | null;
  cleanupAfter?: string | null;
  orphanedAt?: string | null;
  deleteAfter?: string | null;
  reprocessEligible?: boolean;
  reprocessState?: PlatformMediaReprocessState | null;
  reprocessRequestedAt?: string | null;
  reprocessStartedAt?: string | null;
  lastReprocessedAt?: string | null;
  lastReprocessReason?: string | null;
};

export type PlatformMediaTelemetry = {
  pipeline?: string | null;
  surface?: string | null;
  stage?: string | null;
  lastEvent?: string | null;
  lastEventAt?: string | null;
  failureReason?: string | null;
  meta?: Record<string, unknown> | null;
};

export type PlatformMediaMetadata = Record<string, unknown> & {
  title?: string | null;
  description?: string | null;
  mimeType?: string | null;
  originalFilename?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sizeOriginal?: number | null;
  sizeDisplay?: number | null;
  sizeThumbnail?: number | null;
  ogImageUrl?: string | null;
  provider?: string | null;
  surface?: string | null;
  parentType?: string | null;
  parentId?: string | null;
};

export type PlatformMediaAsset = {
  assetId: string;
  ownerId: string;
  sourceType: PlatformMediaSourceType;
  mediaType: PlatformMediaType;
  processingState: PlatformMediaProcessingState;
  moderationStatus: PlatformMediaModerationStatus;
  moderation: PlatformMediaModerationMetadata;
  source: PlatformMediaSourceReference;
  derivatives: {
    original: PlatformMediaDerivativeReference | null;
    display: PlatformMediaDerivativeReference | null;
    thumbnail: PlatformMediaDerivativeReference | null;
  };
  rendering: PlatformMediaRenderingReferences;
  delivery: PlatformMediaDeliveryMetadata;
  fallback: PlatformMediaFallbackMetadata;
  failure: PlatformMediaFailureMetadata | null;
  lifecycle: PlatformMediaLifecycleMetadata;
  metadata: PlatformMediaMetadata;
  telemetry: PlatformMediaTelemetry;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PlatformMediaAssetCreateInput = {
  assetId?: string;
  sourceType: PlatformMediaSourceType;
  mediaType: PlatformMediaType;
  processingState?: PlatformMediaProcessingState;
  moderationStatus?: PlatformMediaModerationStatus;
  moderation?: PlatformMediaModerationMetadata | null;
  source: PlatformMediaSourceReference;
  derivatives?: PlatformMediaDerivatives;
  delivery?: Partial<PlatformMediaDeliveryMetadata>;
  fallback?: PlatformMediaFallbackMetadata;
  failure?: PlatformMediaFailureMetadata | null;
  lifecycle?: Partial<PlatformMediaLifecycleMetadata>;
  metadata?: PlatformMediaMetadata;
  telemetry?: PlatformMediaTelemetry;
};

export type PlatformMediaAssetRetryInput = {
  processingState?: Exclude<PlatformMediaProcessingState, 'deleted'>;
  invalidateDelivery?: boolean;
  reason?: string;
  telemetry?: PlatformMediaTelemetry;
};

export type PlatformMediaAssetReprocessInput = {
  invalidateDelivery?: boolean;
  reason?: string;
  telemetry?: PlatformMediaTelemetry;
};

export type PlatformMediaAssetModerationUpdateInput = {
  moderationStatus?: PlatformMediaModerationStatus;
  moderation?: PlatformMediaModerationMetadata | null;
  abuseReportRef?: PlatformMediaAbuseReportReference | null;
  telemetry?: PlatformMediaTelemetry;
};

function cleanUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function appendQueryParam(
  value: string | null,
  key: string,
  nextValue: string | null | undefined,
): string | null {
  const base = cleanUrl(value);
  const paramValue =
    typeof nextValue === 'string' ? nextValue.trim() : String(nextValue ?? '');
  if (!base || !paramValue) return base;

  try {
    const parsed = new URL(base);
    parsed.searchParams.set(key, paramValue);
    return parsed.toString();
  } catch {
    return base;
  }
}

function applyDeliveryPolicyUrl(
  value: string | null,
  delivery: PlatformMediaDeliveryVariantPolicy | null | undefined,
): string | null {
  if (!delivery || delivery.visibility === 'private') {
    return cleanUrl(value);
  }
  if (!delivery.invalidationToken) {
    return cleanUrl(value);
  }
  return appendQueryParam(value, 'v', delivery.invalidationToken);
}

export function isPlatformMediaSafeToRender(params: {
  moderationStatus?: PlatformMediaModerationStatus | null;
  moderation?: PlatformMediaModerationMetadata | null;
}): boolean {
  if (params.moderation?.safeToRender === false) {
    return false;
  }
  return params.moderationStatus !== 'quarantined';
}

export function buildPlatformMediaRenderingReferences(params: {
  mediaType: PlatformMediaType;
  source: PlatformMediaSourceReference;
  derivatives?: PlatformMediaDerivatives | null;
  fallback?: PlatformMediaFallbackMetadata | null;
  delivery?: PlatformMediaDeliveryMetadata | null;
  moderationStatus?: PlatformMediaModerationStatus | null;
  moderation?: PlatformMediaModerationMetadata | null;
}): PlatformMediaRenderingReferences {
  if (
    !isPlatformMediaSafeToRender({
      moderationStatus: params.moderationStatus,
      moderation: params.moderation,
    })
  ) {
    return {
      originalUrl: null,
      displayUrl: null,
      thumbnailUrl: null,
      primaryUrl: null,
      previewUrl: null,
      posterUrl: null,
      downloadUrl: null,
    };
  }

  const originalUrl = applyDeliveryPolicyUrl(
    cleanUrl(params.derivatives?.original?.url) ??
      cleanUrl(params.source.externalUrl) ??
      null,
    params.delivery?.original,
  );
  const fallbackThumbnailUrl = cleanUrl(params.fallback?.thumbnailUrl);
  const displayUrl = applyDeliveryPolicyUrl(
    cleanUrl(params.derivatives?.display?.url) ??
      (params.mediaType === 'image' ? originalUrl : null) ??
      cleanUrl(params.derivatives?.thumbnail?.url) ??
      fallbackThumbnailUrl ??
      cleanUrl(params.source.externalUrl) ??
      null,
    params.delivery?.display,
  );
  const thumbnailUrl = applyDeliveryPolicyUrl(
    cleanUrl(params.derivatives?.thumbnail?.url) ??
      (params.mediaType === 'image' ? (displayUrl ?? originalUrl) : null) ??
      fallbackThumbnailUrl ??
      null,
    params.delivery?.thumbnail,
  );

  return {
    originalUrl,
    displayUrl,
    thumbnailUrl,
    primaryUrl: displayUrl ?? originalUrl ?? thumbnailUrl ?? null,
    previewUrl: thumbnailUrl ?? displayUrl ?? originalUrl ?? null,
    posterUrl: thumbnailUrl ?? displayUrl ?? fallbackThumbnailUrl ?? null,
    downloadUrl: originalUrl ?? displayUrl ?? null,
  };
}

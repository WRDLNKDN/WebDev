import type {
  PlatformMediaCacheProfile,
  PlatformMediaDeliveryMetadata,
  PlatformMediaDeliveryVariantPolicy,
  PlatformMediaDerivativeReference,
  PlatformMediaFailureMetadata,
  PlatformMediaLifecycleMetadata,
  PlatformMediaProcessingState,
  PlatformMediaRenderingReferences,
  PlatformMediaSourceReference,
  PlatformMediaSourceType,
  PlatformMediaType,
} from './contract';
import { buildPlatformMediaRenderingReferences } from './contract';

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const REVALIDATE_CACHE_CONTROL =
  'public, max-age=300, stale-while-revalidate=86400';
const SIGNED_SHORT_CACHE_CONTROL =
  'private, max-age=60, stale-while-revalidate=30';
const NO_STORE_CACHE_CONTROL = 'no-store';

export const PLATFORM_MEDIA_SIGNED_URL_TTL_SECONDS = 300;
export const PLATFORM_MEDIA_FAILED_RETENTION_DAYS = 7;
export const PLATFORM_MEDIA_DELETED_RETENTION_DAYS = 30;
export const PLATFORM_MEDIA_ORPHANED_RETENTION_DAYS = 3;

type StorageLikeReference = {
  url?: string | null;
  storagePath?: string | null;
};

type DeliveryBuildInput = {
  assetId: string;
  sourceType: PlatformMediaSourceType;
  mediaType: PlatformMediaType;
  source: PlatformMediaSourceReference;
  derivatives: {
    original: PlatformMediaDerivativeReference | null;
    display: PlatformMediaDerivativeReference | null;
    thumbnail: PlatformMediaDerivativeReference | null;
  };
  delivery?: Partial<PlatformMediaDeliveryMetadata> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type LifecycleBuildInput = {
  sourceType: PlatformMediaSourceType;
  processingState: PlatformMediaProcessingState;
  failure?: PlatformMediaFailureMetadata | null;
  lifecycle?: Partial<PlatformMediaLifecycleMetadata> | null;
  metadata?: {
    surface?: string | null;
    parentType?: string | null;
    parentId?: string | null;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toFiniteInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
  }
  return null;
}

function normalizeIsoDate(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function addDays(
  value: string | null | undefined,
  days: number,
): string | null {
  const normalized = normalizeIsoDate(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString();
}

function getUrlPathname(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function isStorageUrl(url: string | null | undefined): boolean {
  const pathname = url ? getUrlPathname(url) : null;
  return Boolean(pathname?.includes('/storage/v1/object/'));
}

function getStructuredPathCandidate(
  reference: StorageLikeReference | null | undefined,
): string | null {
  const storagePath = cleanText(reference?.storagePath);
  if (storagePath) return storagePath;

  const url = cleanText(reference?.url);
  if (!url || !isStorageUrl(url)) return null;
  const pathname = getUrlPathname(url);
  if (!pathname) return null;
  const marker = '/storage/v1/object/';
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) return null;
  const remainder = pathname.slice(markerIndex + marker.length);
  const segments = remainder.split('/').filter(Boolean);
  if (segments[0] === 'public' || segments[0] === 'sign') {
    return segments.slice(2).join('/') || null;
  }
  return null;
}

function isStructuredVariantPath(path: string | null | undefined): boolean {
  return Boolean(
    path && /\/(?:original|display|thumbnail)\.[a-z0-9]+$/i.test(path),
  );
}

function getStoragePrefix(path: string | null | undefined): string | null {
  const candidate = cleanText(path);
  if (!candidate) return null;
  const lastSlashIndex = candidate.lastIndexOf('/');
  if (lastSlashIndex < 0) return null;
  return candidate.slice(0, lastSlashIndex);
}

function buildInvalidationToken(input: {
  assetId: string;
  storageVersion: number;
  updatedAt?: string | null;
  createdAt?: string | null;
}): string {
  const stamp = (
    normalizeIsoDate(input.updatedAt) ??
    normalizeIsoDate(input.createdAt) ??
    new Date().toISOString()
  )
    .replaceAll(/[-:.TZ]/g, '')
    .slice(0, 14);
  return `${input.assetId.slice(0, 8)}-v${input.storageVersion}-${stamp}`;
}

function deriveCacheProfile(params: {
  visibility: PlatformMediaDeliveryVariantPolicy['visibility'];
  reference: StorageLikeReference | null;
}): PlatformMediaCacheProfile {
  if (params.visibility === 'private') return 'no_store';
  if (params.visibility === 'signed') return 'signed_short';
  if (
    getStructuredPathCandidate(params.reference) ||
    isStorageUrl(cleanText(params.reference?.url))
  ) {
    return 'immutable';
  }
  return 'revalidate';
}

function getCacheControl(cacheProfile: PlatformMediaCacheProfile): string {
  switch (cacheProfile) {
    case 'immutable':
      return IMMUTABLE_CACHE_CONTROL;
    case 'signed_short':
      return SIGNED_SHORT_CACHE_CONTROL;
    case 'no_store':
      return NO_STORE_CACHE_CONTROL;
    default:
      return REVALIDATE_CACHE_CONTROL;
  }
}

function buildVariantPolicy(params: {
  kind: PlatformMediaDeliveryVariantPolicy['kind'];
  reference: StorageLikeReference | null;
  invalidationToken: string | null;
}): PlatformMediaDeliveryVariantPolicy | null {
  if (!params.reference?.url && !params.reference?.storagePath) {
    return null;
  }

  const visibility = params.reference?.storagePath
    ? params.reference.url
      ? 'public'
      : 'signed'
    : params.reference?.url
      ? 'public'
      : 'private';
  const cacheProfile = deriveCacheProfile({
    visibility,
    reference: params.reference,
  });

  return {
    kind: params.kind,
    visibility,
    cacheProfile,
    cacheControl: getCacheControl(cacheProfile),
    signedUrlTtlSeconds:
      visibility === 'signed' ? PLATFORM_MEDIA_SIGNED_URL_TTL_SECONDS : null,
    invalidationToken:
      cacheProfile === 'immutable' || cacheProfile === 'signed_short'
        ? params.invalidationToken
        : null,
  };
}

function getOriginalReference(
  input: DeliveryBuildInput,
): StorageLikeReference | null {
  return (
    input.derivatives.original ?? {
      url: input.source.externalUrl ?? null,
      storagePath: input.source.storagePath ?? null,
    }
  );
}

export function buildPlatformMediaDelivery(
  input: DeliveryBuildInput,
): PlatformMediaDeliveryMetadata {
  const requestedVersion = toFiniteInteger(input.delivery?.storageVersion);
  const storageVersion =
    requestedVersion && requestedVersion > 0 ? requestedVersion : 1;

  const structuredPath =
    getStructuredPathCandidate(input.derivatives.display) ??
    getStructuredPathCandidate(input.derivatives.thumbnail) ??
    getStructuredPathCandidate(getOriginalReference(input)) ??
    null;
  const storagePrefix =
    cleanText(input.delivery?.storagePrefix) ??
    getStoragePrefix(structuredPath);
  const invalidationToken =
    cleanText(input.delivery?.invalidationToken) ??
    (storagePrefix || structuredPath
      ? buildInvalidationToken({
          assetId: input.assetId,
          storageVersion,
          updatedAt: input.updatedAt,
          createdAt: input.createdAt,
        })
      : null);

  return {
    storagePrefix,
    storageVersion,
    invalidationToken,
    original: buildVariantPolicy({
      kind: 'original',
      reference: getOriginalReference(input),
      invalidationToken,
    }),
    display: buildVariantPolicy({
      kind: 'display',
      reference: input.derivatives.display,
      invalidationToken,
    }),
    thumbnail: buildVariantPolicy({
      kind: 'thumbnail',
      reference: input.derivatives.thumbnail,
      invalidationToken,
    }),
  };
}

export function bumpPlatformMediaDeliveryVersion(
  delivery: PlatformMediaDeliveryMetadata | null | undefined,
  params: {
    assetId: string;
    updatedAt?: string | null;
    createdAt?: string | null;
  },
): PlatformMediaDeliveryMetadata {
  const nextVersion = Math.max(1, (delivery?.storageVersion ?? 1) + 1);
  const nextToken = buildInvalidationToken({
    assetId: params.assetId,
    storageVersion: nextVersion,
    updatedAt: params.updatedAt,
    createdAt: params.createdAt,
  });
  const nextVariant = (
    variant: PlatformMediaDeliveryVariantPolicy | null,
  ): PlatformMediaDeliveryVariantPolicy | null =>
    variant
      ? {
          ...variant,
          invalidationToken:
            variant.cacheProfile === 'immutable' ||
            variant.cacheProfile === 'signed_short'
              ? nextToken
              : null,
        }
      : null;

  return {
    storagePrefix: delivery?.storagePrefix ?? null,
    storageVersion: nextVersion,
    invalidationToken: nextToken,
    original: nextVariant(delivery?.original ?? null),
    display: nextVariant(delivery?.display ?? null),
    thumbnail: nextVariant(delivery?.thumbnail ?? null),
  };
}

function isExplicitlyOrphaned(
  metadata: LifecycleBuildInput['metadata'],
  cleanupState: string | null,
): boolean {
  if (cleanupState === 'orphaned') return true;
  return (
    cleanText(metadata?.parentType) === 'orphaned' ||
    cleanText(metadata?.surface) === 'upload_intake'
  );
}

export function isPlatformMediaReprocessable(input: {
  sourceType: PlatformMediaSourceType;
  processingState: PlatformMediaProcessingState;
}): boolean {
  if (input.processingState === 'deleted') return false;
  return input.sourceType === 'upload' || input.sourceType === 'generated';
}

export function buildPlatformMediaLifecycle(
  input: LifecycleBuildInput,
): PlatformMediaLifecycleMetadata {
  const cleanupState = cleanText(input.lifecycle?.cleanupState);
  const deletedAt = normalizeIsoDate(input.deletedAt);
  const failure = input.failure ?? null;
  const reprocessEligible = isPlatformMediaReprocessable({
    sourceType: input.sourceType,
    processingState: input.processingState,
  });

  if (deletedAt) {
    return {
      cleanupState: 'deleted',
      cleanupAfter:
        normalizeIsoDate(input.lifecycle?.cleanupAfter) ??
        addDays(deletedAt, PLATFORM_MEDIA_DELETED_RETENTION_DAYS),
      orphanedAt: normalizeIsoDate(input.lifecycle?.orphanedAt),
      deleteAfter:
        normalizeIsoDate(input.lifecycle?.deleteAfter) ??
        addDays(deletedAt, PLATFORM_MEDIA_DELETED_RETENTION_DAYS),
      reprocessEligible: false,
      reprocessState: 'idle',
      reprocessRequestedAt: normalizeIsoDate(
        input.lifecycle?.reprocessRequestedAt,
      ),
      reprocessStartedAt: normalizeIsoDate(input.lifecycle?.reprocessStartedAt),
      lastReprocessedAt: normalizeIsoDate(input.lifecycle?.lastReprocessedAt),
      lastReprocessReason: cleanText(input.lifecycle?.lastReprocessReason),
    };
  }

  if (input.processingState === 'failed') {
    return {
      cleanupState: 'failed_retained',
      cleanupAfter:
        normalizeIsoDate(input.lifecycle?.cleanupAfter) ??
        addDays(
          normalizeIsoDate(failure?.failedAt) ??
            normalizeIsoDate(input.updatedAt) ??
            normalizeIsoDate(input.createdAt),
          PLATFORM_MEDIA_FAILED_RETENTION_DAYS,
        ),
      orphanedAt: normalizeIsoDate(input.lifecycle?.orphanedAt),
      deleteAfter: normalizeIsoDate(input.lifecycle?.deleteAfter),
      reprocessEligible,
      reprocessState:
        cleanText(input.lifecycle?.reprocessState) === 'queued'
          ? 'queued'
          : 'failed',
      reprocessRequestedAt: normalizeIsoDate(
        input.lifecycle?.reprocessRequestedAt,
      ),
      reprocessStartedAt: normalizeIsoDate(input.lifecycle?.reprocessStartedAt),
      lastReprocessedAt: normalizeIsoDate(input.lifecycle?.lastReprocessedAt),
      lastReprocessReason:
        cleanText(input.lifecycle?.lastReprocessReason) ??
        cleanText(failure?.reason),
    };
  }

  if (isExplicitlyOrphaned(input.metadata, cleanupState)) {
    const orphanedAt =
      normalizeIsoDate(input.lifecycle?.orphanedAt) ??
      normalizeIsoDate(input.updatedAt) ??
      normalizeIsoDate(input.createdAt) ??
      new Date().toISOString();
    return {
      cleanupState: 'orphaned',
      cleanupAfter:
        normalizeIsoDate(input.lifecycle?.cleanupAfter) ??
        addDays(orphanedAt, PLATFORM_MEDIA_ORPHANED_RETENTION_DAYS),
      orphanedAt,
      deleteAfter: normalizeIsoDate(input.lifecycle?.deleteAfter),
      reprocessEligible,
      reprocessState:
        cleanText(input.lifecycle?.reprocessState) === 'queued'
          ? 'queued'
          : 'idle',
      reprocessRequestedAt: normalizeIsoDate(
        input.lifecycle?.reprocessRequestedAt,
      ),
      reprocessStartedAt: normalizeIsoDate(input.lifecycle?.reprocessStartedAt),
      lastReprocessedAt: normalizeIsoDate(input.lifecycle?.lastReprocessedAt),
      lastReprocessReason: cleanText(input.lifecycle?.lastReprocessReason),
    };
  }

  return {
    cleanupState: 'active',
    cleanupAfter: normalizeIsoDate(input.lifecycle?.cleanupAfter),
    orphanedAt: normalizeIsoDate(input.lifecycle?.orphanedAt),
    deleteAfter: normalizeIsoDate(input.lifecycle?.deleteAfter),
    reprocessEligible,
    reprocessState:
      input.processingState === 'processing' ? 'processing' : 'idle',
    reprocessRequestedAt: normalizeIsoDate(
      input.lifecycle?.reprocessRequestedAt,
    ),
    reprocessStartedAt: normalizeIsoDate(input.lifecycle?.reprocessStartedAt),
    lastReprocessedAt: normalizeIsoDate(input.lifecycle?.lastReprocessedAt),
    lastReprocessReason: cleanText(input.lifecycle?.lastReprocessReason),
  };
}

export function markPlatformMediaLifecycleRetried(
  lifecycle: PlatformMediaLifecycleMetadata | null | undefined,
): PlatformMediaLifecycleMetadata {
  return {
    cleanupState: 'active',
    cleanupAfter: null,
    orphanedAt:
      lifecycle?.cleanupState === 'orphaned'
        ? (lifecycle.orphanedAt ?? null)
        : null,
    deleteAfter: null,
    reprocessEligible: lifecycle?.reprocessEligible ?? true,
    reprocessState: 'queued',
    reprocessRequestedAt: new Date().toISOString(),
    reprocessStartedAt: null,
    lastReprocessedAt: lifecycle?.lastReprocessedAt ?? null,
    lastReprocessReason: lifecycle?.lastReprocessReason ?? null,
  };
}

export function markPlatformMediaLifecycleDeleted(
  lifecycle: PlatformMediaLifecycleMetadata | null | undefined,
  deletedAt: string,
): PlatformMediaLifecycleMetadata {
  return {
    cleanupState: 'deleted',
    cleanupAfter: addDays(deletedAt, PLATFORM_MEDIA_DELETED_RETENTION_DAYS),
    orphanedAt: lifecycle?.orphanedAt ?? null,
    deleteAfter: addDays(deletedAt, PLATFORM_MEDIA_DELETED_RETENTION_DAYS),
    reprocessEligible: false,
    reprocessState: 'idle',
    reprocessRequestedAt: lifecycle?.reprocessRequestedAt ?? null,
    reprocessStartedAt: null,
    lastReprocessedAt: lifecycle?.lastReprocessedAt ?? null,
    lastReprocessReason: lifecycle?.lastReprocessReason ?? null,
  };
}

export function markPlatformMediaLifecycleReprocessRequested(
  lifecycle: PlatformMediaLifecycleMetadata | null | undefined,
  reason?: string | null,
): PlatformMediaLifecycleMetadata {
  const requestedAt = new Date().toISOString();
  return {
    cleanupState:
      lifecycle?.cleanupState === 'deleted' ? 'pending_delete' : 'active',
    cleanupAfter: null,
    orphanedAt: null,
    deleteAfter: null,
    reprocessEligible: lifecycle?.reprocessEligible ?? true,
    reprocessState: 'queued',
    reprocessRequestedAt: requestedAt,
    reprocessStartedAt: null,
    lastReprocessedAt: lifecycle?.lastReprocessedAt ?? null,
    lastReprocessReason: cleanText(reason) ?? null,
  };
}

export function buildDeliveryAwareRenderingReferences(params: {
  mediaType: PlatformMediaType;
  source: PlatformMediaSourceReference;
  derivatives: {
    original: PlatformMediaDerivativeReference | null;
    display: PlatformMediaDerivativeReference | null;
    thumbnail: PlatformMediaDerivativeReference | null;
  };
  fallback?: { thumbnailUrl?: string | null } | null;
  delivery: PlatformMediaDeliveryMetadata;
}): PlatformMediaRenderingReferences {
  return buildPlatformMediaRenderingReferences({
    mediaType: params.mediaType,
    source: params.source,
    derivatives: params.derivatives,
    fallback: params.fallback ?? null,
    delivery: params.delivery,
  });
}

export const __deliveryInternals = {
  addDays,
  buildInvalidationToken,
  deriveCacheProfile,
  getStoragePrefix,
  getStructuredPathCandidate,
  isStructuredVariantPath,
};

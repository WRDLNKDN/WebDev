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

function cleanText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toFiniteInteger(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
  }
  return null;
}

function normalizeIsoDate(value) {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function addDays(value, days) {
  const normalized = normalizeIsoDate(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString();
}

function getUrlPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function isStorageUrl(url) {
  const pathname = url ? getUrlPathname(url) : null;
  return Boolean(pathname?.includes('/storage/v1/object/'));
}

function getStructuredPathCandidate(reference) {
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

function getStoragePrefix(path) {
  const candidate = cleanText(path);
  if (!candidate) return null;
  const lastSlashIndex = candidate.lastIndexOf('/');
  if (lastSlashIndex < 0) return null;
  return candidate.slice(0, lastSlashIndex);
}

function buildInvalidationToken(input) {
  const stamp = (
    normalizeIsoDate(input.updatedAt) ??
    normalizeIsoDate(input.createdAt) ??
    new Date().toISOString()
  )
    .replaceAll(/[-:.TZ]/g, '')
    .slice(0, 14);
  return `${input.assetId.slice(0, 8)}-v${input.storageVersion}-${stamp}`;
}

function deriveCacheProfile({ visibility, reference }) {
  if (visibility === 'private') return 'no_store';
  if (visibility === 'signed') return 'signed_short';
  if (
    getStructuredPathCandidate(reference) ||
    isStorageUrl(cleanText(reference?.url))
  ) {
    return 'immutable';
  }
  return 'revalidate';
}

function getCacheControl(cacheProfile) {
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

function buildVariantPolicy({ kind, reference, invalidationToken }) {
  if (!reference?.url && !reference?.storagePath) {
    return null;
  }

  const visibility = reference?.storagePath
    ? reference.url
      ? 'public'
      : 'signed'
    : reference?.url
      ? 'public'
      : 'private';
  const cacheProfile = deriveCacheProfile({ visibility, reference });

  return {
    kind,
    visibility,
    cacheProfile,
    cacheControl: getCacheControl(cacheProfile),
    signedUrlTtlSeconds:
      visibility === 'signed' ? PLATFORM_MEDIA_SIGNED_URL_TTL_SECONDS : null,
    invalidationToken:
      cacheProfile === 'immutable' || cacheProfile === 'signed_short'
        ? invalidationToken
        : null,
  };
}

function getOriginalReference(input) {
  return (
    input.derivatives.original ?? {
      url: input.source.externalUrl ?? null,
      storagePath: input.source.storagePath ?? null,
    }
  );
}

export function buildMediaDeliveryMetadata(input) {
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

export function bumpMediaDeliveryVersion(delivery, params) {
  const nextVersion = Math.max(1, (delivery?.storageVersion ?? 1) + 1);
  const nextToken = buildInvalidationToken({
    assetId: params.assetId,
    storageVersion: nextVersion,
    updatedAt: params.updatedAt,
    createdAt: params.createdAt,
  });
  const nextVariant = (variant) =>
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

function isExplicitlyOrphaned(metadata, cleanupState) {
  if (cleanupState === 'orphaned') return true;
  return (
    cleanText(metadata?.parentType) === 'orphaned' ||
    cleanText(metadata?.surface) === 'upload_intake'
  );
}

export function isMediaAssetReprocessable(input) {
  if (input.processingState === 'deleted') return false;
  return input.sourceType === 'upload' || input.sourceType === 'generated';
}

export function buildMediaLifecycleMetadata(input) {
  const cleanupState = cleanText(input.lifecycle?.cleanupState);
  const deletedAt = normalizeIsoDate(input.deletedAt);
  const failure = input.failure ?? null;
  const reprocessEligible = isMediaAssetReprocessable({
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

export function markMediaLifecycleRetried(lifecycle) {
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

export function markMediaLifecycleDeleted(lifecycle, deletedAt) {
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

export function markMediaLifecycleReprocessRequested(lifecycle, reason) {
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

export const __mediaDeliveryInternals = {
  addDays,
  buildInvalidationToken,
  deriveCacheProfile,
  getStoragePrefix,
  getStructuredPathCandidate,
};

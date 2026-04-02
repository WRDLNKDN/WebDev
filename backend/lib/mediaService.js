import crypto from 'crypto';
import {
  buildMediaDeliveryMetadata,
  buildMediaLifecycleMetadata,
  bumpMediaDeliveryVersion,
  isMediaAssetReprocessable,
  markMediaLifecycleDeleted,
  markMediaLifecycleReprocessRequested,
  markMediaLifecycleRetried,
} from './mediaDelivery.js';
import {
  buildQuarantinedFailure,
  cleanMediaModerationMetadata,
  isMediaQuarantined,
  normalizeMediaAbuseReportRef,
  resolveMediaModeration,
} from './mediaModeration.js';
import {
  asPlainObject,
  cleanNullableText,
  cleanText,
  cleanUrl,
  sanitizeJsonValue,
} from './mediaSanitizers.js';

export const MEDIA_ASSET_SOURCE_TYPES = [
  'upload',
  'link',
  'gif_provider',
  'generated',
];

export const MEDIA_ASSET_MEDIA_TYPES = ['image', 'video', 'doc', 'gif', 'link'];

export const MEDIA_ASSET_PROCESSING_STATES = [
  'pending',
  'uploading',
  'processing',
  'ready',
  'failed',
  'deleted',
];

const SOURCE_TYPE_SET = new Set(MEDIA_ASSET_SOURCE_TYPES);
const MEDIA_TYPE_SET = new Set(MEDIA_ASSET_MEDIA_TYPES);
const PROCESSING_STATE_SET = new Set(MEDIA_ASSET_PROCESSING_STATES);
const DEFAULT_FALLBACK_LABELS = {
  image: 'Image preview',
  video: 'Video preview',
  doc: 'Document preview',
  gif: 'GIF preview',
  link: 'Link preview',
};

export class MediaServiceError extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.name = 'MediaServiceError';
    this.status = status;
    this.code = code;
  }
}

function cleanPath(value) {
  return cleanNullableText(value, 2048);
}

function sanitizeMediaJsonValue(value) {
  return sanitizeJsonValue(value, { maxEntries: 50 });
}

function appendQueryParam(value, key, nextValue) {
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

function applyDeliveryUrl(value, delivery) {
  const url = cleanUrl(value);
  if (!delivery || delivery.visibility === 'private') return url;
  if (!delivery.invalidationToken) return url;
  return appendQueryParam(url, 'v', delivery.invalidationToken);
}

function cleanInteger(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
  }
  return null;
}

function cleanSourceRef(value) {
  const source = asPlainObject(value);
  const cleaned = {
    provider: cleanNullableText(source.provider, 120),
    externalUrl: cleanUrl(source.externalUrl ?? source.url),
    storageBucket: cleanNullableText(source.storageBucket, 120),
    storagePath: cleanPath(source.storagePath),
    mimeType: cleanNullableText(source.mimeType, 120),
  };

  return Object.fromEntries(
    Object.entries(cleaned).filter(([, entry]) => entry != null),
  );
}

function cleanDerivativeRef(kind, value) {
  const derivative = asPlainObject(value);
  const cleaned = {
    kind,
    url: cleanUrl(derivative.url),
    storageBucket: cleanNullableText(derivative.storageBucket, 120),
    storagePath: cleanPath(derivative.storagePath),
    mimeType: cleanNullableText(derivative.mimeType, 120),
    width: cleanInteger(derivative.width),
    height: cleanInteger(derivative.height),
    durationMs: cleanInteger(derivative.durationMs),
    sizeBytes: cleanInteger(derivative.sizeBytes),
  };

  const filtered = Object.fromEntries(
    Object.entries(cleaned).filter(([, entry]) => entry != null),
  );
  return Object.keys(filtered).length > 1 ? filtered : null;
}

function cleanDerivatives(value) {
  const input = asPlainObject(value);
  return {
    original: cleanDerivativeRef('original', input.original),
    display: cleanDerivativeRef('display', input.display),
    thumbnail: cleanDerivativeRef('thumbnail', input.thumbnail),
  };
}

function cleanMetadata(value) {
  const metadata = sanitizeMediaJsonValue(value);
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {};
}

function cleanFailureMetadata(value) {
  const input = asPlainObject(value);
  const cleaned = {
    code: cleanNullableText(input.code, 120),
    reason: cleanNullableText(input.reason, 500),
    detail: cleanNullableText(input.detail, 1000),
    stage: cleanNullableText(input.stage, 120),
    retryable:
      typeof input.retryable === 'boolean' ? input.retryable : undefined,
    failedAt: cleanNullableText(input.failedAt, 80),
  };
  const filtered = Object.fromEntries(
    Object.entries(cleaned).filter(([, entry]) => entry != null),
  );
  return Object.keys(filtered).length ? filtered : null;
}

function cleanFallbackMetadata(value) {
  const input = asPlainObject(value);
  const cleaned = {
    strategy: cleanNullableText(input.strategy, 120),
    reason: cleanNullableText(input.reason, 500),
    label: cleanNullableText(input.label, 160),
    thumbnailUrl: cleanUrl(input.thumbnailUrl),
  };
  return Object.fromEntries(
    Object.entries(cleaned).filter(([, entry]) => entry != null),
  );
}

function getStoredModerationState(row) {
  const merged = resolveMediaModeration({
    currentStatus: row.moderation_status,
    currentModeration: mapStoredJson(row.moderation_metadata),
    abuseReportRef: mapStoredJson(row.abuse_report_ref),
  });

  return {
    moderationStatus: merged.moderationStatus,
    moderation: merged.moderation,
  };
}

function cleanTelemetry(value) {
  const input = asPlainObject(value);
  const base = {
    pipeline: cleanNullableText(input.pipeline, 120),
    surface: cleanNullableText(input.surface, 120),
    stage: cleanNullableText(input.stage, 120),
    lastEvent: cleanNullableText(input.lastEvent, 120),
    lastEventAt: cleanNullableText(input.lastEventAt, 80),
    failureReason: cleanNullableText(input.failureReason, 500),
  };
  const meta = sanitizeMediaJsonValue(input.meta);

  return {
    ...Object.fromEntries(
      Object.entries(base).filter(([, entry]) => entry != null),
    ),
    ...(meta && typeof meta === 'object' && !Array.isArray(meta)
      ? { meta }
      : {}),
  };
}

export function buildMediaRenderingReferences(params) {
  if (isMediaQuarantined(params.moderationStatus, params.moderation)) {
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

  const source = asPlainObject(params.source);
  const original =
    params.original && typeof params.original === 'object'
      ? params.original
      : null;
  const display =
    params.display && typeof params.display === 'object'
      ? params.display
      : null;
  const thumbnail =
    params.thumbnail && typeof params.thumbnail === 'object'
      ? params.thumbnail
      : null;
  const fallback = asPlainObject(params.fallback);
  const delivery = asPlainObject(params.delivery);
  const mediaType = cleanText(params.mediaType, 40) || 'image';

  const sourceUrl = cleanUrl(source.externalUrl);
  const originalUrl = applyDeliveryUrl(
    cleanUrl(original?.url) ?? sourceUrl ?? null,
    asPlainObject(delivery.original),
  );
  const fallbackThumbnailUrl = cleanUrl(fallback.thumbnailUrl);
  const displayUrl = applyDeliveryUrl(
    cleanUrl(display?.url) ??
      (mediaType === 'image' ? originalUrl : null) ??
      cleanUrl(thumbnail?.url) ??
      fallbackThumbnailUrl ??
      sourceUrl ??
      null,
    asPlainObject(delivery.display),
  );
  const thumbnailUrl = applyDeliveryUrl(
    cleanUrl(thumbnail?.url) ??
      (mediaType === 'image' ? (displayUrl ?? originalUrl) : null) ??
      fallbackThumbnailUrl ??
      null,
    asPlainObject(delivery.thumbnail),
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

function buildFallbackMetadata(params) {
  if (isMediaQuarantined(params.moderationStatus, params.moderation)) {
    return {
      strategy: 'quarantined_placeholder',
      label: 'Media unavailable',
      thumbnailUrl: null,
      reason: 'This media is unavailable.',
    };
  }

  const provided = cleanFallbackMetadata(params.fallback);
  const rendering = buildMediaRenderingReferences(params);
  const label =
    provided.label ??
    cleanNullableText(params.metadata?.title, 160) ??
    DEFAULT_FALLBACK_LABELS[params.mediaType] ??
    'Media preview';
  const strategy =
    provided.strategy ??
    (rendering.thumbnailUrl
      ? 'derivative_thumbnail'
      : rendering.displayUrl
        ? 'display_fallback'
        : 'deterministic_thumbnail');
  const reason =
    provided.reason ??
    (rendering.thumbnailUrl
      ? null
      : 'Thumbnail derivative unavailable. Use fallback rendering.');

  return {
    strategy,
    label,
    thumbnailUrl: provided.thumbnailUrl ?? rendering.thumbnailUrl ?? null,
    ...(reason ? { reason } : {}),
  };
}

function normalizeSourceWithPreview(sourceType, source, preview) {
  if (!preview || (sourceType !== 'link' && sourceType !== 'gif_provider')) {
    return source;
  }

  return {
    ...source,
    externalUrl: cleanUrl(preview.url) ?? source.externalUrl ?? null,
    provider:
      cleanNullableText(source.provider, 120) ??
      cleanNullableText(preview.siteName, 120) ??
      null,
  };
}

function applyLinkPreviewToDerivatives(params) {
  const preview = params.preview;
  const source = params.source;
  const derivatives = params.derivatives;

  if (
    !preview ||
    (params.sourceType !== 'link' && params.sourceType !== 'gif_provider')
  ) {
    return derivatives;
  }

  const previewUrl = cleanUrl(preview.url) ?? source.externalUrl ?? null;
  const previewImageUrl = cleanUrl(preview.image);

  return {
    original:
      derivatives.original ??
      (previewUrl
        ? {
            kind: 'original',
            url: previewUrl,
          }
        : null),
    display:
      derivatives.display ??
      (previewImageUrl
        ? {
            kind: 'display',
            url: previewImageUrl,
          }
        : previewUrl
          ? {
              kind: 'display',
              url: previewUrl,
            }
          : null),
    thumbnail:
      derivatives.thumbnail ??
      (previewImageUrl
        ? {
            kind: 'thumbnail',
            url: previewImageUrl,
          }
        : null),
  };
}

function mergeMetadataWithPreview(metadata, source, preview) {
  return {
    ...metadata,
    title:
      cleanNullableText(metadata.title, 300) ??
      cleanNullableText(preview?.title, 300) ??
      null,
    description:
      cleanNullableText(metadata.description, 500) ??
      cleanNullableText(preview?.description, 500) ??
      null,
    ogImageUrl:
      cleanUrl(metadata.ogImageUrl) ?? cleanUrl(preview?.image) ?? null,
    provider:
      cleanNullableText(metadata.provider, 120) ??
      source.provider ??
      cleanNullableText(preview?.siteName, 120) ??
      null,
  };
}

function normalizeProcessingState(input, hasFailure) {
  const requested = cleanText(input, 40);
  if (requested && PROCESSING_STATE_SET.has(requested)) {
    return requested;
  }
  return hasFailure ? 'failed' : 'ready';
}

function validateCreateInput(input) {
  if (!SOURCE_TYPE_SET.has(input.sourceType)) {
    throw new MediaServiceError(400, 'Invalid sourceType', 'BAD_REQUEST');
  }
  if (!MEDIA_TYPE_SET.has(input.mediaType)) {
    throw new MediaServiceError(400, 'Invalid mediaType', 'BAD_REQUEST');
  }
  if (
    (input.sourceType === 'link' || input.sourceType === 'gif_provider') &&
    !input.source.externalUrl
  ) {
    throw new MediaServiceError(
      400,
      'Link and GIF provider assets require source.externalUrl',
      'BAD_REQUEST',
    );
  }
  if (
    input.sourceType === 'upload' &&
    !input.source.storagePath &&
    !input.derivatives.original?.storagePath &&
    !input.derivatives.original?.url
  ) {
    throw new MediaServiceError(
      400,
      'Uploaded assets require a source storagePath or original derivative reference',
      'BAD_REQUEST',
    );
  }
}

async function insertMediaEvent(supabase, params) {
  const payload = {
    asset_id: params.assetId,
    actor_id: params.actorId ?? null,
    event_name: params.eventName,
    pipeline: params.pipeline ?? null,
    processing_state: params.processingState ?? null,
    failure_code: params.failureCode ?? null,
    failure_reason: params.failureReason ?? null,
    meta: sanitizeMediaJsonValue(params.meta) ?? {},
  };
  const { error } = await supabase.from('media_asset_events').insert(payload);
  if (error) {
    console.warn('[media-assets] failed to write media_asset_events', error);
  }
}

async function insertAuditEvent(supabase, params) {
  const action = cleanText(params.action, 120) || 'MEDIA_ASSET_EVENT';
  const { error } = await supabase.from('audit_log').insert({
    actor_id: params.actorId ?? null,
    actor_email: null,
    action,
    target_type: 'media_asset',
    target_id: params.assetId,
    meta: sanitizeMediaJsonValue(params.meta) ?? {},
  });
  if (error) {
    console.warn('[media-assets] failed to write audit_log', error);
  }
}

async function trackMediaTelemetry(supabase, params) {
  const stage =
    cleanNullableText(params.meta?.stage, 120) ??
    cleanNullableText(params.processingState, 120) ??
    'upload';
  const surface = cleanNullableText(params.meta?.surface, 120);
  const log =
    params.failureCode || params.failureReason ? console.warn : console.info;
  log('[media-assets]', {
    eventName: params.eventName,
    stage,
    surface,
    assetId: params.assetId,
    pipeline: params.pipeline ?? null,
    processingState: params.processingState ?? null,
    failureCode: params.failureCode ?? null,
    failureReason: params.failureReason ?? null,
    meta: sanitizeMediaJsonValue(params.meta) ?? {},
  });
  await Promise.all([
    insertMediaEvent(supabase, params),
    insertAuditEvent(supabase, {
      actorId: params.actorId,
      assetId: params.assetId,
      action: params.auditAction,
      meta: params.meta,
    }),
  ]);
}

function mapStoredJson(value) {
  const object = asPlainObject(value);
  return Object.keys(object).length ? object : null;
}

export function mapMediaAssetRow(row) {
  const source = mapStoredJson(row.source_ref) ?? {};
  const original = mapStoredJson(row.original_ref);
  const display = mapStoredJson(row.display_ref);
  const thumbnail = mapStoredJson(row.thumbnail_ref);
  const fallback = mapStoredJson(row.fallback_metadata) ?? {};
  const storedFailure = mapStoredJson(row.failure_metadata);
  const metadata = mapStoredJson(row.metadata) ?? {};
  const telemetry = mapStoredJson(row.telemetry) ?? {};
  const { moderationStatus, moderation } = getStoredModerationState(row);
  const failure = isMediaQuarantined(moderationStatus, moderation)
    ? (storedFailure ?? buildQuarantinedFailure({ detail: moderation.reason }))
    : storedFailure;
  const processingState =
    row.processing_state === 'deleted'
      ? 'deleted'
      : isMediaQuarantined(moderationStatus, moderation)
        ? 'failed'
        : row.processing_state;
  const delivery = buildMediaDeliveryMetadata({
    assetId: row.id,
    sourceType: row.source_type,
    mediaType: row.media_type,
    source,
    derivatives: {
      original,
      display,
      thumbnail,
    },
    delivery: mapStoredJson(row.delivery_metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  const lifecycle = buildMediaLifecycleMetadata({
    sourceType: row.source_type,
    processingState,
    failure,
    lifecycle: mapStoredJson(row.lifecycle_metadata),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
  const rendering = buildMediaRenderingReferences({
    source,
    original,
    display,
    thumbnail,
    fallback,
    delivery,
    mediaType: row.media_type,
    moderationStatus,
    moderation,
  });

  return {
    assetId: row.id,
    ownerId: row.owner_id,
    sourceType: row.source_type,
    mediaType: row.media_type,
    processingState,
    moderationStatus,
    moderation,
    source,
    derivatives: {
      original,
      display,
      thumbnail,
    },
    rendering,
    delivery,
    fallback,
    failure,
    lifecycle,
    metadata,
    telemetry,
    retryCount: row.retry_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

async function getOwnedAssetRow(
  supabase,
  userId,
  assetId,
  includeDeleted = false,
) {
  let query = supabase
    .from('media_assets')
    .select('*')
    .eq('id', assetId)
    .eq('owner_id', userId);

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new MediaServiceError(500, 'Server error', 'INTERNAL_ERROR');
  }
  if (!data) {
    throw new MediaServiceError(404, 'Media asset not found', 'NOT_FOUND');
  }
  return data;
}

async function getAssetRowById(supabase, assetId, includeDeleted = false) {
  let query = supabase.from('media_assets').select('*').eq('id', assetId);

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new MediaServiceError(500, 'Server error', 'INTERNAL_ERROR');
  }
  if (!data) {
    throw new MediaServiceError(404, 'Media asset not found', 'NOT_FOUND');
  }
  return data;
}

export async function createMediaAsset(params) {
  const sourceType = cleanText(params.body?.sourceType, 40);
  const mediaType = cleanText(params.body?.mediaType, 40);
  const source = cleanSourceRef(params.body?.source);
  let derivatives = cleanDerivatives(params.body?.derivatives);
  let metadata = cleanMetadata(params.body?.metadata);
  let failure = cleanFailureMetadata(params.body?.failure);
  let telemetry = cleanTelemetry(params.body?.telemetry);
  let moderation = cleanMediaModerationMetadata(params.body?.moderation);
  let abuseReportRef = normalizeMediaAbuseReportRef(
    params.body?.abuseReportRef,
  );

  validateCreateInput({
    sourceType,
    mediaType,
    source,
    derivatives,
  });

  const preview =
    (sourceType === 'link' || sourceType === 'gif_provider') &&
    typeof params.fetchLinkPreview === 'function' &&
    source.externalUrl
      ? await params.fetchLinkPreview(source.externalUrl)
      : null;

  const normalizedSource = normalizeSourceWithPreview(
    sourceType,
    source,
    preview,
  );
  derivatives = applyLinkPreviewToDerivatives({
    sourceType,
    source: normalizedSource,
    derivatives,
    preview,
  });
  metadata = mergeMetadataWithPreview(metadata, normalizedSource, preview);

  const safetyDecision =
    typeof params.runMediaSafetyCheck === 'function'
      ? await params.runMediaSafetyCheck({
          sourceType,
          mediaType,
          source: normalizedSource,
          metadata,
          inputSafetyHook: params.body?.safetyHook,
        })
      : null;
  const moderationState = resolveMediaModeration({
    requestedStatus: params.body?.moderationStatus,
    requestedModeration: moderation,
    abuseReportRef,
    safetyDecision,
    provider: normalizedSource.provider ?? metadata.provider ?? null,
  });
  const moderationStatus = moderationState.moderationStatus;
  moderation = moderationState.moderation;
  abuseReportRef =
    normalizeMediaAbuseReportRef(moderation.abuseReport) ?? abuseReportRef;

  const fallback = buildFallbackMetadata({
    mediaType,
    fallback: params.body?.fallback,
    metadata,
    source: normalizedSource,
    original: derivatives.original,
    display: derivatives.display,
    thumbnail: derivatives.thumbnail,
    moderationStatus,
    moderation,
  });

  let processingState = normalizeProcessingState(
    params.body?.processingState,
    Boolean(failure),
  );

  if (isMediaQuarantined(moderationStatus, moderation)) {
    processingState = 'failed';
    failure = buildQuarantinedFailure({
      detail: moderation.reason,
    });
  }

  if (processingState === 'failed' && !failure) {
    failure = {
      code: 'PROCESSING_FAILED',
      reason: 'The asset entered a failed processing state.',
      stage: cleanNullableText(telemetry.stage, 120) ?? 'processing',
      retryable: true,
      failedAt: new Date().toISOString(),
    };
  }

  telemetry = {
    ...telemetry,
    lastEvent: telemetry.lastEvent ?? 'asset_registered',
    lastEventAt: telemetry.lastEventAt ?? new Date().toISOString(),
    ...(failure?.reason ? { failureReason: failure.reason } : {}),
  };

  const assetId =
    cleanNullableText(params.body?.assetId, 80) ?? crypto.randomUUID();
  const delivery = buildMediaDeliveryMetadata({
    assetId,
    sourceType,
    mediaType,
    source: normalizedSource,
    derivatives,
    delivery: asPlainObject(params.body?.delivery),
    createdAt: null,
    updatedAt: telemetry.lastEventAt,
  });
  const lifecycle = buildMediaLifecycleMetadata({
    sourceType,
    processingState,
    failure,
    lifecycle: asPlainObject(params.body?.lifecycle),
    metadata,
    createdAt: null,
    updatedAt: telemetry.lastEventAt,
    deletedAt: null,
  });
  const insertPayload = {
    id: assetId,
    owner_id: params.userId,
    source_type: sourceType,
    media_type: mediaType,
    processing_state: processingState,
    source_ref: normalizedSource,
    original_ref: derivatives.original,
    display_ref: derivatives.display,
    thumbnail_ref: derivatives.thumbnail,
    rendering_references: buildMediaRenderingReferences({
      mediaType,
      source: normalizedSource,
      original: derivatives.original,
      display: derivatives.display,
      thumbnail: derivatives.thumbnail,
      fallback,
      delivery,
      moderationStatus,
      moderation,
    }),
    delivery_metadata: delivery,
    fallback_metadata: fallback,
    failure_metadata: failure,
    moderation_status: moderationStatus,
    moderation_metadata: moderation,
    abuse_report_ref: abuseReportRef,
    lifecycle_metadata: lifecycle,
    metadata,
    telemetry,
    last_failure_code: failure?.code ?? null,
    last_failure_reason: failure?.reason ?? null,
  };

  const { data, error } = await params.supabase
    .from('media_assets')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    throw new MediaServiceError(500, 'Server error', 'INTERNAL_ERROR');
  }

  await trackMediaTelemetry(params.supabase, {
    actorId: params.userId,
    assetId,
    eventName: 'asset_registered',
    auditAction: 'MEDIA_ASSET_REGISTERED',
    pipeline: cleanNullableText(telemetry.pipeline, 120),
    processingState,
    failureCode: failure?.code ?? null,
    failureReason: failure?.reason ?? null,
    meta: {
      stage: processingState === 'failed' ? 'conversion' : 'upload',
      mediaType,
      sourceType,
      surface: metadata.surface ?? null,
      pipeline: telemetry.pipeline ?? null,
      state: processingState,
      moderationStatus,
      safetyHookStatus: moderation.hookStatus ?? null,
      abuseReportId: abuseReportRef?.reportId ?? null,
    },
  });

  return mapMediaAssetRow(data);
}

export async function fetchMediaAsset(params) {
  const row = await getOwnedAssetRow(
    params.supabase,
    params.userId,
    params.assetId,
  );
  return mapMediaAssetRow(row);
}

export async function updateMediaAssetModeration(params) {
  const current = await getAssetRowById(params.supabase, params.assetId, true);
  const currentModeration = getStoredModerationState(current);
  const source = mapStoredJson(current.source_ref) ?? {};
  const original = mapStoredJson(current.original_ref);
  const display = mapStoredJson(current.display_ref);
  const thumbnail = mapStoredJson(current.thumbnail_ref);
  const metadata = mapStoredJson(current.metadata) ?? {};
  const fallbackInput = mapStoredJson(current.fallback_metadata) ?? {};
  const telemetry = {
    ...(mapStoredJson(current.telemetry) ?? {}),
    ...cleanTelemetry(params.body?.telemetry),
    lastEvent: 'moderation_updated',
    lastEventAt: new Date().toISOString(),
  };
  const moderationState = resolveMediaModeration({
    currentStatus: currentModeration.moderationStatus,
    currentModeration: currentModeration.moderation,
    requestedStatus: params.body?.moderationStatus,
    requestedModeration: params.body?.moderation,
    abuseReportRef: params.body?.abuseReportRef,
  });
  const moderationStatus = moderationState.moderationStatus;
  const moderation = moderationState.moderation;
  const abuseReportRef = normalizeMediaAbuseReportRef(
    moderation.abuseReport ?? params.body?.abuseReportRef,
  );
  const quarantined = isMediaQuarantined(moderationStatus, moderation);
  const hadQuarantineFailure =
    current.last_failure_code === 'MEDIA_QUARANTINED';
  const nextState =
    current.processing_state === 'deleted'
      ? 'deleted'
      : quarantined
        ? 'failed'
        : hadQuarantineFailure && current.processing_state === 'failed'
          ? 'ready'
          : current.processing_state;
  const failure = quarantined
    ? buildQuarantinedFailure({
        detail: moderation.reason,
      })
    : hadQuarantineFailure
      ? null
      : mapStoredJson(current.failure_metadata);
  const delivery = buildMediaDeliveryMetadata({
    assetId: current.id,
    sourceType: current.source_type,
    mediaType: current.media_type,
    source,
    derivatives: {
      original,
      display,
      thumbnail,
    },
    delivery: mapStoredJson(current.delivery_metadata),
    createdAt: current.created_at,
    updatedAt: current.updated_at,
  });
  const fallback = buildFallbackMetadata({
    mediaType: current.media_type,
    fallback: fallbackInput,
    metadata,
    source,
    original,
    display,
    thumbnail,
    moderationStatus,
    moderation,
  });
  const lifecycle = buildMediaLifecycleMetadata({
    sourceType: current.source_type,
    processingState: nextState,
    failure,
    lifecycle: mapStoredJson(current.lifecycle_metadata),
    metadata,
    createdAt: current.created_at,
    updatedAt: telemetry.lastEventAt,
    deletedAt: current.deleted_at,
  });

  const { data, error } = await params.supabase
    .from('media_assets')
    .update({
      processing_state: nextState,
      moderation_status: moderationStatus,
      moderation_metadata: moderation,
      abuse_report_ref: abuseReportRef,
      failure_metadata: failure,
      last_failure_code: failure?.code ?? null,
      last_failure_reason: failure?.reason ?? null,
      fallback_metadata: fallback,
      lifecycle_metadata: lifecycle,
      telemetry,
      rendering_references: buildMediaRenderingReferences({
        mediaType: current.media_type,
        source,
        original,
        display,
        thumbnail,
        fallback,
        delivery,
        moderationStatus,
        moderation,
      }),
    })
    .eq('id', current.id)
    .select('*')
    .single();

  if (error) {
    throw new MediaServiceError(500, 'Server error', 'INTERNAL_ERROR');
  }

  await trackMediaTelemetry(params.supabase, {
    actorId: params.actorId ?? null,
    assetId: current.id,
    eventName: 'asset_moderation_updated',
    auditAction: 'MEDIA_ASSET_MODERATION_UPDATED',
    pipeline: cleanNullableText(telemetry.pipeline, 120),
    processingState: data.processing_state,
    failureCode: failure?.code ?? null,
    failureReason: failure?.reason ?? null,
    meta: {
      stage: 'moderation',
      previousModerationStatus: currentModeration.moderationStatus,
      moderationStatus,
      abuseReportId: abuseReportRef?.reportId ?? null,
      quarantined,
    },
  });

  return mapMediaAssetRow(data);
}

export async function retryMediaAsset(params) {
  const current = await getOwnedAssetRow(
    params.supabase,
    params.userId,
    params.assetId,
  );
  if (current.deleted_at) {
    throw new MediaServiceError(
      409,
      'Deleted assets cannot be retried',
      'CONFLICT',
    );
  }
  const currentModeration = getStoredModerationState(current);
  if (
    isMediaQuarantined(
      currentModeration.moderationStatus,
      currentModeration.moderation,
    )
  ) {
    throw new MediaServiceError(
      409,
      'Quarantined assets cannot be retried',
      'MEDIA_QUARANTINED',
    );
  }

  const telemetry = {
    ...(mapStoredJson(current.telemetry) ?? {}),
    ...cleanTelemetry(params.body?.telemetry),
    lastEvent: 'retry_requested',
    lastEventAt: new Date().toISOString(),
  };
  const source = mapStoredJson(current.source_ref) ?? {};
  const original = mapStoredJson(current.original_ref);
  const display = mapStoredJson(current.display_ref);
  const thumbnail = mapStoredJson(current.thumbnail_ref);
  const delivery = buildMediaDeliveryMetadata({
    assetId: current.id,
    sourceType: current.source_type,
    mediaType: current.media_type,
    source,
    derivatives: {
      original,
      display,
      thumbnail,
    },
    delivery: mapStoredJson(current.delivery_metadata),
    createdAt: current.created_at,
    updatedAt: current.updated_at,
  });
  const lifecycle = markMediaLifecycleRetried(
    buildMediaLifecycleMetadata({
      sourceType: current.source_type,
      processingState: current.processing_state,
      failure: mapStoredJson(current.failure_metadata),
      lifecycle: mapStoredJson(current.lifecycle_metadata),
      metadata: mapStoredJson(current.metadata) ?? {},
      createdAt: current.created_at,
      updatedAt: current.updated_at,
      deletedAt: current.deleted_at,
    }),
  );
  const nextState = normalizeProcessingState(
    params.body?.processingState,
    false,
  );
  const { data, error } = await params.supabase
    .from('media_assets')
    .update({
      processing_state: nextState === 'deleted' ? 'pending' : nextState,
      failure_metadata: null,
      last_failure_code: null,
      last_failure_reason: null,
      retry_count: (current.retry_count ?? 0) + 1,
      lifecycle_metadata: lifecycle,
      telemetry,
      rendering_references: buildMediaRenderingReferences({
        mediaType: current.media_type,
        source,
        original,
        display,
        thumbnail,
        fallback: mapStoredJson(current.fallback_metadata) ?? {},
        delivery,
        moderationStatus: currentModeration.moderationStatus,
        moderation: currentModeration.moderation,
      }),
    })
    .eq('id', current.id)
    .eq('owner_id', params.userId)
    .select('*')
    .single();

  if (error) {
    throw new MediaServiceError(500, 'Server error', 'INTERNAL_ERROR');
  }

  await trackMediaTelemetry(params.supabase, {
    actorId: params.userId,
    assetId: current.id,
    eventName: 'asset_retry_requested',
    auditAction: 'MEDIA_ASSET_RETRY_REQUESTED',
    pipeline: cleanNullableText(telemetry.pipeline, 120),
    processingState: data.processing_state,
    failureCode: null,
    failureReason: null,
    meta: {
      stage: 'upload',
      previousState: current.processing_state,
      nextState: data.processing_state,
      retryCount: data.retry_count,
      reason: cleanNullableText(params.body?.reason, 500),
      moderationStatus: currentModeration.moderationStatus,
    },
  });

  return mapMediaAssetRow(data);
}

export async function reprocessMediaAsset(params) {
  const current = await getOwnedAssetRow(
    params.supabase,
    params.userId,
    params.assetId,
  );
  if (current.deleted_at) {
    throw new MediaServiceError(
      409,
      'Deleted assets cannot be reprocessed',
      'CONFLICT',
    );
  }
  const currentModeration = getStoredModerationState(current);
  if (
    isMediaQuarantined(
      currentModeration.moderationStatus,
      currentModeration.moderation,
    )
  ) {
    throw new MediaServiceError(
      409,
      'Quarantined assets cannot be reprocessed',
      'MEDIA_QUARANTINED',
    );
  }
  if (
    !isMediaAssetReprocessable({
      sourceType: current.source_type,
      processingState: current.processing_state,
    })
  ) {
    throw new MediaServiceError(
      409,
      'This asset type cannot be reprocessed',
      'CONFLICT',
    );
  }

  const requestedAt = new Date().toISOString();
  const telemetry = {
    ...(mapStoredJson(current.telemetry) ?? {}),
    ...cleanTelemetry(params.body?.telemetry),
    lastEvent: 'reprocess_requested',
    lastEventAt: requestedAt,
  };
  const source = mapStoredJson(current.source_ref) ?? {};
  const original = mapStoredJson(current.original_ref);
  const display = mapStoredJson(current.display_ref);
  const thumbnail = mapStoredJson(current.thumbnail_ref);
  const currentDelivery = buildMediaDeliveryMetadata({
    assetId: current.id,
    sourceType: current.source_type,
    mediaType: current.media_type,
    source,
    derivatives: {
      original,
      display,
      thumbnail,
    },
    delivery: mapStoredJson(current.delivery_metadata),
    createdAt: current.created_at,
    updatedAt: current.updated_at,
  });
  const nextDelivery =
    params.body?.invalidateDelivery === false
      ? currentDelivery
      : bumpMediaDeliveryVersion(currentDelivery, {
          assetId: current.id,
          updatedAt: requestedAt,
          createdAt: current.created_at,
        });
  const nextLifecycle = markMediaLifecycleReprocessRequested(
    buildMediaLifecycleMetadata({
      sourceType: current.source_type,
      processingState: current.processing_state,
      failure: mapStoredJson(current.failure_metadata),
      lifecycle: mapStoredJson(current.lifecycle_metadata),
      metadata: mapStoredJson(current.metadata) ?? {},
      createdAt: current.created_at,
      updatedAt: current.updated_at,
      deletedAt: current.deleted_at,
    }),
    params.body?.reason,
  );
  const nextState =
    current.processing_state === 'uploading' ? 'uploading' : 'processing';
  const { data, error } = await params.supabase
    .from('media_assets')
    .update({
      processing_state: nextState,
      failure_metadata: null,
      last_failure_code: null,
      last_failure_reason: null,
      delivery_metadata: nextDelivery,
      lifecycle_metadata: nextLifecycle,
      telemetry,
      rendering_references: buildMediaRenderingReferences({
        mediaType: current.media_type,
        source,
        original,
        display,
        thumbnail,
        fallback: mapStoredJson(current.fallback_metadata) ?? {},
        delivery: nextDelivery,
        moderationStatus: currentModeration.moderationStatus,
        moderation: currentModeration.moderation,
      }),
    })
    .eq('id', current.id)
    .eq('owner_id', params.userId)
    .select('*')
    .single();

  if (error) {
    throw new MediaServiceError(500, 'Server error', 'INTERNAL_ERROR');
  }

  await trackMediaTelemetry(params.supabase, {
    actorId: params.userId,
    assetId: current.id,
    eventName: 'asset_reprocess_requested',
    auditAction: 'MEDIA_ASSET_REPROCESS_REQUESTED',
    pipeline: cleanNullableText(telemetry.pipeline, 120),
    processingState: data.processing_state,
    failureCode: null,
    failureReason: null,
    meta: {
      stage: 'conversion',
      previousState: current.processing_state,
      nextState: data.processing_state,
      invalidateDelivery: params.body?.invalidateDelivery !== false,
      deliveryVersion: nextDelivery.storageVersion,
      reason: cleanNullableText(params.body?.reason, 500),
      moderationStatus: currentModeration.moderationStatus,
    },
  });

  return mapMediaAssetRow(data);
}

export async function deleteMediaAsset(params) {
  const current = await getOwnedAssetRow(
    params.supabase,
    params.userId,
    params.assetId,
    true,
  );

  if (current.deleted_at) {
    return;
  }

  const telemetry = {
    ...(mapStoredJson(current.telemetry) ?? {}),
    ...cleanTelemetry(params.body?.telemetry),
    lastEvent: 'asset_deleted',
    lastEventAt: new Date().toISOString(),
  };
  const deletedAt = new Date().toISOString();
  const currentModeration = getStoredModerationState(current);
  const lifecycle = markMediaLifecycleDeleted(
    buildMediaLifecycleMetadata({
      sourceType: current.source_type,
      processingState: current.processing_state,
      failure: mapStoredJson(current.failure_metadata),
      lifecycle: mapStoredJson(current.lifecycle_metadata),
      metadata: mapStoredJson(current.metadata) ?? {},
      createdAt: current.created_at,
      updatedAt: current.updated_at,
      deletedAt: current.deleted_at,
    }),
    deletedAt,
  );
  const { error } = await params.supabase
    .from('media_assets')
    .update({
      processing_state: 'deleted',
      deleted_at: deletedAt,
      lifecycle_metadata: lifecycle,
      telemetry,
    })
    .eq('id', current.id)
    .eq('owner_id', params.userId);

  if (error) {
    throw new MediaServiceError(500, 'Server error', 'INTERNAL_ERROR');
  }

  await trackMediaTelemetry(params.supabase, {
    actorId: params.userId,
    assetId: current.id,
    eventName: 'asset_deleted',
    auditAction: 'MEDIA_ASSET_DELETED',
    pipeline: cleanNullableText(telemetry.pipeline, 120),
    processingState: 'deleted',
    failureCode: null,
    failureReason: cleanNullableText(params.body?.reason, 500),
    meta: {
      stage: 'upload',
      deletedAt,
      reason: cleanNullableText(params.body?.reason, 500),
      moderationStatus: currentModeration.moderationStatus,
    },
  });
}

export function toMediaServiceError(error) {
  if (error instanceof MediaServiceError) return error;
  return new MediaServiceError(500, 'Server error', 'INTERNAL_ERROR');
}

export const __mediaServiceInternals = {
  buildFallbackMetadata,
  buildMediaRenderingReferences,
  cleanDerivativeRef,
  cleanSourceRef,
  mergeMetadataWithPreview,
  normalizeProcessingState,
};

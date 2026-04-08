import {
  asPlainObject,
  cleanNullableText,
  cleanStringArray,
  cleanText,
  cleanUrl,
  sanitizeJsonValue,
} from './mediaSanitizers.js';

export const MEDIA_ASSET_MODERATION_STATUSES = [
  'unreviewed',
  'pending_review',
  'approved',
  'reported',
  'quarantined',
];

export const MEDIA_ASSET_SAFETY_HOOK_STATUSES = [
  'not_run',
  'pending',
  'passed',
  'review',
  'blocked',
  'error',
];

const MODERATION_STATUS_SET = new Set(MEDIA_ASSET_MODERATION_STATUSES);
const SAFETY_HOOK_STATUS_SET = new Set(MEDIA_ASSET_SAFETY_HOOK_STATUSES);

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeModerationStatusInternal(value, fallback = 'unreviewed') {
  const cleaned = cleanText(value, 40);
  return MODERATION_STATUS_SET.has(cleaned) ? cleaned : fallback;
}

function normalizeSafetyHookStatusInternal(value, fallback = null) {
  const cleaned = cleanText(value, 40);
  if (SAFETY_HOOK_STATUS_SET.has(cleaned)) return cleaned;
  return fallback;
}

export function normalizeMediaAbuseReportRef(value) {
  const input = asPlainObject(value);
  const cleaned = {
    reportId: cleanNullableText(input.reportId ?? input.id, 120),
    reportType: cleanNullableText(input.reportType ?? input.type, 120),
    queueId: cleanNullableText(input.queueId, 120),
    url: cleanUrl(input.url),
    status: cleanNullableText(input.status, 120),
    reportedAt: cleanNullableText(input.reportedAt, 80),
    reason: cleanNullableText(input.reason, 500),
  };

  const filtered = Object.fromEntries(
    Object.entries(cleaned).filter(([, entry]) => entry != null),
  );
  return Object.keys(filtered).length ? filtered : null;
}

export function cleanMediaModerationMetadata(value) {
  const input = asPlainObject(value);
  const safetyHook = asPlainObject(input.safetyHook);
  const abuseReport = normalizeMediaAbuseReportRef(
    input.abuseReport ?? input.abuseReportRef,
  );
  const hookStatus = normalizeSafetyHookStatusInternal(
    safetyHook.status ?? input.hookStatus,
  );
  const unsafeReasons = cleanStringArray(
    input.unsafeReasons ?? safetyHook.unsafeReasons ?? safetyHook.reasons,
  );
  const meta = sanitizeJsonValue(input.meta ?? safetyHook.meta);

  const cleaned = {
    source: cleanNullableText(input.source, 120),
    safeToRender:
      typeof input.safeToRender === 'boolean' ? input.safeToRender : undefined,
    quarantinedAt: cleanNullableText(input.quarantinedAt, 80),
    reviewedAt: cleanNullableText(input.reviewedAt, 80),
    reason: cleanNullableText(input.reason, 500),
    unsafeReasons: unsafeReasons.length ? unsafeReasons : null,
    provider: cleanNullableText(safetyHook.provider ?? input.provider, 120),
    hookStatus,
    providerReference: cleanNullableText(
      safetyHook.providerReference ??
        safetyHook.assetReference ??
        input.providerReference,
      240,
    ),
    note: cleanNullableText(input.note, 1000),
    abuseReport,
    meta:
      meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : null,
  };

  return Object.fromEntries(
    Object.entries(cleaned).filter(([, entry]) => entry != null),
  );
}

export function normalizeProviderSafetyDecision(value, options = {}) {
  const input = asPlainObject(value);
  const provider =
    cleanNullableText(input.provider, 120) ??
    cleanNullableText(options.provider, 120);
  const hookStatus = normalizeSafetyHookStatusInternal(
    input.status ?? input.hookStatus,
    provider ? 'not_run' : null,
  );

  if (!provider && !hookStatus) return null;

  const unsafeReasons = cleanStringArray(input.unsafeReasons ?? input.reasons);
  const meta = sanitizeJsonValue(input.meta);

  const cleaned = {
    provider,
    hookStatus,
    providerReference: cleanNullableText(
      input.providerReference ?? input.assetReference,
      240,
    ),
    reason: cleanNullableText(input.reason, 500),
    unsafeReasons: unsafeReasons.length ? unsafeReasons : null,
    meta:
      meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : null,
  };

  return Object.fromEntries(
    Object.entries(cleaned).filter(([, entry]) => entry != null),
  );
}

export function runMediaSafetyCheck(params) {
  const provider =
    cleanNullableText(params.source?.provider, 120) ??
    cleanNullableText(params.metadata?.provider, 120) ??
    (params.sourceType === 'gif_provider' ? 'giphy' : null);

  if (params.inputSafetyHook != null) {
    const explicitDecision = normalizeProviderSafetyDecision(
      params.inputSafetyHook,
      { provider },
    );
    if (explicitDecision) {
      return explicitDecision;
    }
  }

  if (params.sourceType === 'gif_provider') {
    return {
      provider: provider ?? 'giphy',
      hookStatus: 'passed',
      providerReference: cleanNullableText(params.source?.externalUrl, 240),
      reason: null,
      unsafeReasons: [],
      meta: {
        providerSafetyMode: 'provider_default_filter',
      },
    };
  }

  if (!provider) return null;

  return {
    provider,
    hookStatus: 'not_run',
  };
}

export function isMediaQuarantined(status, moderation) {
  return (
    normalizeModerationStatusInternal(status) === 'quarantined' ||
    moderation?.safeToRender === false
  );
}

export function buildQuarantinedFailure(input = {}) {
  return {
    code: 'MEDIA_QUARANTINED',
    reason: 'This media is unavailable.',
    detail:
      cleanNullableText(input.detail ?? input.reason, 1000) ??
      'This asset was quarantined by safety checks.',
    stage: 'moderation',
    retryable: false,
    failedAt: cleanNullableText(input.failedAt, 80) ?? new Date().toISOString(),
  };
}

export function resolveMediaModeration(params) {
  const now = cleanNullableText(params.now, 80) ?? new Date().toISOString();
  const currentModeration = cleanMediaModerationMetadata(
    params.currentModeration,
  );
  const requested = cleanMediaModerationMetadata(params.requestedModeration);
  const safetyDecision = normalizeProviderSafetyDecision(
    params.safetyDecision,
    {
      provider:
        requested.provider ??
        currentModeration.provider ??
        cleanNullableText(params.provider, 120),
    },
  );
  const abuseReport = normalizeMediaAbuseReportRef(
    params.abuseReportRef ??
      requested.abuseReport ??
      currentModeration.abuseReport,
  );
  const requestedStatus = cleanText(params.requestedStatus, 40);
  const explicitStatus = MODERATION_STATUS_SET.has(requestedStatus)
    ? requestedStatus
    : null;

  let status =
    explicitStatus ??
    cleanNullableText(params.currentStatus, 40) ??
    (abuseReport ? 'reported' : 'unreviewed');

  if (requested.safeToRender === false) {
    status = 'quarantined';
  }

  if (safetyDecision?.hookStatus === 'blocked') {
    status = 'quarantined';
  } else if (!explicitStatus && status !== 'quarantined') {
    if (
      safetyDecision?.hookStatus === 'pending' ||
      safetyDecision?.hookStatus === 'review' ||
      safetyDecision?.hookStatus === 'error'
    ) {
      status = 'pending_review';
    } else if (abuseReport) {
      status = 'reported';
    } else if (
      safetyDecision?.hookStatus === 'passed' &&
      status === 'unreviewed'
    ) {
      status = 'approved';
    }
  }

  const unsafeReasons = uniqueStrings([
    ...cleanStringArray(currentModeration.unsafeReasons),
    ...cleanStringArray(requested.unsafeReasons),
    ...cleanStringArray(safetyDecision?.unsafeReasons),
  ]);
  const safeToRender =
    status === 'quarantined'
      ? false
      : typeof requested.safeToRender === 'boolean'
        ? requested.safeToRender
        : typeof currentModeration.safeToRender === 'boolean'
          ? currentModeration.safeToRender
          : true;

  const moderation = {
    source:
      requested.source ??
      currentModeration.source ??
      (safetyDecision?.hookStatus && safetyDecision.hookStatus !== 'not_run'
        ? 'provider_hook'
        : abuseReport
          ? 'abuse_report'
          : null),
    safeToRender,
    quarantinedAt:
      status === 'quarantined'
        ? (requested.quarantinedAt ?? currentModeration.quarantinedAt ?? now)
        : null,
    reviewedAt:
      requested.reviewedAt ??
      currentModeration.reviewedAt ??
      (status === 'approved' ? now : null),
    reason:
      requested.reason ?? safetyDecision?.reason ?? currentModeration.reason,
    unsafeReasons: unsafeReasons.length ? unsafeReasons : null,
    provider:
      requested.provider ??
      safetyDecision?.provider ??
      currentModeration.provider,
    hookStatus:
      requested.hookStatus ??
      safetyDecision?.hookStatus ??
      currentModeration.hookStatus ??
      null,
    providerReference:
      requested.providerReference ??
      safetyDecision?.providerReference ??
      currentModeration.providerReference,
    note: requested.note ?? currentModeration.note,
    abuseReport,
    meta:
      requested.meta ?? safetyDecision?.meta ?? currentModeration.meta ?? null,
  };

  return {
    moderationStatus: normalizeModerationStatusInternal(status),
    moderation: Object.fromEntries(
      Object.entries(moderation).filter(([, entry]) => entry != null),
    ),
  };
}

export const __mediaModerationInternals = {
  cleanMediaModerationMetadata,
  normalizeMediaAbuseReportRef,
  normalizeProviderSafetyDecision,
  normalizeModerationStatusInternal,
  normalizeSafetyHookStatusInternal,
};

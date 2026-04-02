declare module '*mediaModeration.js' {
  export type MediaModerationStatus =
    | 'unreviewed'
    | 'pending_review'
    | 'approved'
    | 'reported'
    | 'quarantined';

  export type MediaSafetyHookStatus =
    | 'not_run'
    | 'pending'
    | 'passed'
    | 'review'
    | 'blocked'
    | 'error';

  export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue | undefined };

  export interface MediaAbuseReportRef {
    reportId?: string | null;
    reportType?: string | null;
    queueId?: string | null;
    url?: string | null;
    status?: string | null;
    reportedAt?: string | null;
    reason?: string | null;
  }

  export interface ProviderSafetyDecision {
    provider?: string | null;
    hookStatus?: MediaSafetyHookStatus | null;
    providerReference?: string | null;
    reason?: string | null;
    unsafeReasons?: string[] | null;
    meta?: { [key: string]: JsonValue | undefined } | null;
  }

  export interface MediaModerationMetadata {
    source?: string | null;
    safeToRender?: boolean;
    quarantinedAt?: string | null;
    reviewedAt?: string | null;
    reason?: string | null;
    unsafeReasons?: string[] | null;
    provider?: string | null;
    hookStatus?: MediaSafetyHookStatus | null;
    providerReference?: string | null;
    note?: string | null;
    abuseReport?: MediaAbuseReportRef | null;
    meta?: { [key: string]: JsonValue | undefined } | null;
  }

  export interface MediaSafetyCheckParams {
    sourceType?: string | null;
    source?: {
      provider?: string | null;
      externalUrl?: string | null;
      [key: string]: JsonValue | undefined;
    } | null;
    metadata?: {
      provider?: string | null;
      [key: string]: JsonValue | undefined;
    } | null;
    inputSafetyHook?: Partial<ProviderSafetyDecision> | null;
  }

  export interface ResolveMediaModerationParams {
    now?: string | null;
    currentModeration?: Partial<MediaModerationMetadata> | null;
    requestedModeration?: Partial<MediaModerationMetadata> | null;
    safetyDecision?: Partial<ProviderSafetyDecision> | null;
    abuseReportRef?: Partial<MediaAbuseReportRef> | null;
    requestedStatus?: string | null;
    currentStatus?: string | null;
    provider?: string | null;
  }

  export function runMediaSafetyCheck(
    params: MediaSafetyCheckParams,
  ): ProviderSafetyDecision | null;

  export function buildQuarantinedFailure(input?: {
    detail?: string | null;
    reason?: string | null;
    failedAt?: string | null;
  }): {
    code: 'MEDIA_QUARANTINED';
    reason: string;
    detail: string;
    stage: 'moderation';
    retryable: false;
    failedAt: string;
  };

  export function resolveMediaModeration(
    params: ResolveMediaModerationParams,
  ): {
    moderationStatus: MediaModerationStatus;
    moderation: MediaModerationMetadata;
  };

  export function isMediaQuarantined(
    status: string | null | undefined,
    moderation?: { safeToRender?: boolean | null } | null,
  ): boolean;

  export const __mediaModerationInternals: {
    cleanMediaModerationMetadata(value: unknown): MediaModerationMetadata;
    normalizeMediaAbuseReportRef(value: unknown): MediaAbuseReportRef | null;
    normalizeProviderSafetyDecision(
      value: unknown,
      options?: { provider?: string | null },
    ): ProviderSafetyDecision | null;
    normalizeModerationStatusInternal(
      value: unknown,
      fallback?: MediaModerationStatus,
    ): MediaModerationStatus;
    normalizeSafetyHookStatusInternal(
      value: unknown,
      fallback?: MediaSafetyHookStatus | null,
    ): MediaSafetyHookStatus | null;
  };
}

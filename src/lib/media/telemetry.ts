/**
 * Client media telemetry → `/api/media/telemetry`. Ops & QA overview:
 * docs/architecture/MEDIA_OBSERVABILITY_AND_QA.md
 */
import { authedFetch } from '../api/authFetch';
import { API_BASE } from '../api/contentApiCore';
import { supabase } from '../auth/supabaseClient';

export const MEDIA_TELEMETRY_STAGES = [
  'validation',
  'upload',
  'optimization',
  'conversion',
  'preview',
  'render',
] as const;

export type MediaTelemetryStage = (typeof MEDIA_TELEMETRY_STAGES)[number];
export type MediaTelemetryLevel = 'info' | 'warn' | 'error';

export type MediaTelemetryEvent = {
  eventName: string;
  stage: MediaTelemetryStage;
  surface?: string | null;
  assetId?: string | null;
  requestId?: string | null;
  pipeline?: string | null;
  status?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  level?: MediaTelemetryLevel;
  dedupeKey?: string | null;
  meta?: Record<string, unknown> | null;
};

const sentTelemetryKeys = new Set<string>();

function cleanText(value: string | null | undefined, max = 240): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanMeta(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 40)
      .map(([key, entry]) => [key, entry ?? null]),
  );
}

function normalizeEvent(event: MediaTelemetryEvent) {
  const failureCode = cleanText(event.failureCode, 120);
  const failureReason = cleanText(event.failureReason, 500);
  const level =
    event.level ??
    (failureCode || failureReason || event.status === 'failed'
      ? 'error'
      : 'info');

  return {
    eventName: cleanText(event.eventName, 120) ?? 'media_client_event',
    stage: event.stage,
    surface: cleanText(event.surface, 120),
    assetId: cleanText(event.assetId, 80),
    requestId: cleanText(event.requestId, 160),
    pipeline: cleanText(event.pipeline, 120) ?? 'client',
    status: cleanText(event.status, 80),
    failureCode,
    failureReason,
    level,
    meta: {
      ...cleanMeta(event.meta),
      userAgent:
        typeof navigator !== 'undefined'
          ? cleanText(navigator.userAgent, 240)
          : null,
      viewport:
        typeof window !== 'undefined'
          ? {
              width: window.innerWidth,
              height: window.innerHeight,
            }
          : null,
    },
  };
}

function buildDedupeKey(event: ReturnType<typeof normalizeEvent>): string {
  return [
    event.eventName,
    event.stage,
    event.surface ?? '',
    event.assetId ?? '',
    event.requestId ?? '',
    event.failureCode ?? '',
    event.status ?? '',
  ].join('::');
}

function logClientMediaTelemetry(
  event: ReturnType<typeof normalizeEvent>,
): void {
  const method =
    event.level === 'error'
      ? console.warn
      : event.level === 'warn'
        ? console.warn
        : console.info;
  method('[media-client]', event);
}

export function resetMediaTelemetryForTests(): void {
  sentTelemetryKeys.clear();
}

export async function reportMediaTelemetry(
  input: MediaTelemetryEvent,
): Promise<void> {
  const event = normalizeEvent(input);
  const dedupeKey = cleanText(input.dedupeKey, 240) ?? buildDedupeKey(event);
  if (sentTelemetryKeys.has(dedupeKey)) return;
  sentTelemetryKeys.add(dedupeKey);

  logClientMediaTelemetry(event);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? null;
    if (!accessToken) {
      return;
    }

    const res = await authedFetch(
      `${API_BASE}/api/media/telemetry`,
      {
        method: 'POST',
        body: JSON.stringify({ event }),
      },
      {
        accessToken,
        retryOn401: false,
      },
    );

    if (!res.ok) {
      console.warn('[media-client] telemetry request failed', {
        status: res.status,
        eventName: event.eventName,
        stage: event.stage,
      });
    }
  } catch (error) {
    console.warn('[media-client] telemetry request failed', {
      error: error instanceof Error ? error.message : String(error),
      eventName: event.eventName,
      stage: event.stage,
    });
  }
}

export function reportMediaTelemetryAsync(input: MediaTelemetryEvent): void {
  void reportMediaTelemetry(input);
}

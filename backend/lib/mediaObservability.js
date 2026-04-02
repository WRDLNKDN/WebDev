const MEDIA_HEALTH_STAGES = [
  'validation',
  'upload',
  'optimization',
  'conversion',
  'preview',
  'render',
];

const FAILURE_CATEGORY_BY_STAGE = {
  validation: 'uploadFailures',
  upload: 'uploadFailures',
  optimization: 'conversionFailures',
  conversion: 'conversionFailures',
  preview: 'previewFailures',
  render: 'renderFailures',
};

function cleanText(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanNullableText(value, max = 240) {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

function sanitizeJsonValue(value, depth = 0) {
  if (depth > 4) return null;
  if (value == null) return null;
  if (typeof value === 'string') return value.trim().slice(0, 2000);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, 40)
      .map((entry) => sanitizeJsonValue(entry, depth + 1))
      .filter((entry) => entry != null);
  }
  if (typeof value !== 'object') return null;

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 40)
      .map(([key, entry]) => [
        key.slice(0, 80),
        sanitizeJsonValue(entry, depth + 1),
      ])
      .filter(([, entry]) => entry != null),
  );
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function isFailureLike(entry) {
  const eventName = cleanText(entry.eventName, 160).toLowerCase();
  const status = cleanText(entry.status, 80).toLowerCase();
  return Boolean(
    entry.failureCode ||
    entry.failureReason ||
    status === 'failed' ||
    status === 'fallback' ||
    eventName.includes('failed') ||
    eventName.includes('error'),
  );
}

function inferStage(entry) {
  const directStage = cleanNullableText(entry.stage, 80);
  if (directStage && MEDIA_HEALTH_STAGES.includes(directStage)) {
    return directStage;
  }

  const eventName = cleanText(entry.eventName, 160).toLowerCase();
  if (
    eventName.includes('render') ||
    eventName.includes('clipped') ||
    eventName.includes('fallback_visible')
  ) {
    return 'render';
  }
  if (
    eventName.includes('preview') ||
    eventName.includes('thumbnail') ||
    eventName.includes('gif_picker')
  ) {
    return 'preview';
  }
  if (eventName.includes('convert')) return 'conversion';
  if (eventName.includes('optimiz')) return 'optimization';
  if (eventName.includes('validat')) return 'validation';
  return 'upload';
}

function normalizeClientEvent(raw) {
  const meta = asObject(sanitizeJsonValue(raw.meta) ?? {});
  return {
    source: 'client',
    eventName: cleanText(raw.eventName, 120) || 'media_client_event',
    stage: inferStage(raw),
    surface: cleanNullableText(raw.surface, 120),
    assetId: cleanNullableText(raw.assetId, 80),
    requestId: cleanNullableText(raw.requestId, 160),
    pipeline: cleanNullableText(raw.pipeline, 120) ?? 'client',
    status: cleanNullableText(raw.status, 80),
    failureCode: cleanNullableText(raw.failureCode, 120),
    failureReason: cleanNullableText(raw.failureReason, 500),
    level:
      cleanNullableText(raw.level, 40) ??
      (raw.failureCode || raw.failureReason ? 'error' : 'info'),
    meta,
    createdAt: new Date().toISOString(),
  };
}

function logMediaEvent(entry) {
  const logger = isFailureLike(entry) ? console.warn : console.info;
  logger('[media-observability]', {
    source: entry.source ?? 'server',
    eventName: entry.eventName,
    stage: entry.stage,
    surface: entry.surface ?? null,
    assetId: entry.assetId ?? null,
    requestId: entry.requestId ?? null,
    pipeline: entry.pipeline ?? null,
    status: entry.status ?? null,
    failureCode: entry.failureCode ?? null,
    failureReason: entry.failureReason ?? null,
    meta: entry.meta ?? {},
  });
}

export function normalizeClientMediaTelemetryPayload(body) {
  const entries = Array.isArray(body?.events)
    ? body.events
    : body?.event
      ? [body.event]
      : body && typeof body === 'object'
        ? [body]
        : [];

  return entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => normalizeClientEvent(entry));
}

export async function persistClientMediaTelemetry(supabase, params) {
  const rows = params.events.map((event) => {
    logMediaEvent(event);
    return {
      actor_id: params.actorId ?? null,
      actor_email: null,
      action: 'MEDIA_CLIENT_TELEMETRY',
      target_type: 'media_pipeline',
      target_id: event.assetId ?? event.requestId ?? event.eventName,
      meta:
        sanitizeJsonValue({
          ...event.meta,
          source: event.source ?? 'client',
          eventName: event.eventName,
          stage: event.stage,
          surface: event.surface,
          assetId: event.assetId,
          requestId: event.requestId,
          pipeline: event.pipeline,
          status: event.status,
          failureCode: event.failureCode,
          failureReason: event.failureReason,
          level: event.level,
        }) ?? {},
    };
  });

  if (rows.length === 0) return;

  const { error } = await supabase.from('audit_log').insert(rows);
  if (error) {
    console.warn('[media-observability] failed to persist client telemetry', {
      message: error.message,
      count: rows.length,
    });
  }
}

function countFailureCategory(stage, counters) {
  const key = FAILURE_CATEGORY_BY_STAGE[stage];
  if (key) {
    counters[key] += 1;
  }
}

function toStageMetricMap() {
  return new Map(
    MEDIA_HEALTH_STAGES.map((stage) => [
      stage,
      {
        stage,
        totalEvents: 0,
        failureEvents: 0,
        latestEventAt: null,
      },
    ]),
  );
}

function sortByCreatedAtDesc(a, b) {
  return Date.parse(b.createdAt ?? 0) - Date.parse(a.createdAt ?? 0);
}

export function summarizeMediaHealth(params) {
  const stageMetrics = toStageMetricMap();
  const surfaceMetrics = new Map();
  const failureMetrics = {
    uploadFailures: 0,
    previewFailures: 0,
    conversionFailures: 0,
    renderFailures: 0,
    gifFailures: 0,
  };
  const recentFailures = [];

  for (const event of params.events) {
    const stage = inferStage(event);
    const metric = stageMetrics.get(stage);
    const createdAt = cleanNullableText(event.createdAt, 80);
    const failed = isFailureLike(event);

    if (metric) {
      metric.totalEvents += 1;
      if (failed) {
        metric.failureEvents += 1;
      }
      if (
        createdAt &&
        (!metric.latestEventAt ||
          Date.parse(createdAt) > Date.parse(metric.latestEventAt))
      ) {
        metric.latestEventAt = createdAt;
      }
    }

    const surface = cleanNullableText(event.surface, 120) ?? 'unknown';
    const surfaceMetric = surfaceMetrics.get(surface) ?? {
      surface,
      totalEvents: 0,
      failureEvents: 0,
    };
    surfaceMetric.totalEvents += 1;
    if (failed) {
      surfaceMetric.failureEvents += 1;
      countFailureCategory(stage, failureMetrics);
      if (
        cleanText(event.eventName, 160).toLowerCase().includes('gif') ||
        cleanNullableText(event.failureCode, 120) === 'gif_search_failed'
      ) {
        failureMetrics.gifFailures += 1;
      }
      recentFailures.push({
        source: cleanNullableText(event.source, 40) ?? 'client',
        createdAt,
        eventName: cleanText(event.eventName, 120),
        stage,
        surface,
        assetId: cleanNullableText(event.assetId, 80),
        requestId: cleanNullableText(event.requestId, 160),
        failureCode: cleanNullableText(event.failureCode, 120),
        failureReason: cleanNullableText(event.failureReason, 500),
      });
    }
    surfaceMetrics.set(surface, surfaceMetric);
  }

  return {
    generatedAt: params.generatedAt,
    windowHours: params.windowHours,
    assetSummary: params.assetSummary,
    pipelineCoverage: {
      pipelineEvents: params.events.filter((event) => event.source === 'asset')
        .length,
      clientEvents: params.events.filter((event) => event.source !== 'asset')
        .length,
      structuredLoggingEnabled: true,
    },
    stageMetrics: Array.from(stageMetrics.values()),
    surfaceMetrics: Array.from(surfaceMetrics.values()).sort(
      (a, b) =>
        b.failureEvents - a.failureEvents || b.totalEvents - a.totalEvents,
    ),
    failureMetrics,
    recentFailures: recentFailures.sort(sortByCreatedAtDesc).slice(0, 12),
  };
}

async function countMediaAssets(supabase, filters = {}) {
  let query = supabase
    .from('media_assets')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (filters.processingState) {
    query = query.eq('processing_state', filters.processingState);
  }
  if (filters.updatedBefore) {
    query = query.lt('updated_at', filters.updatedBefore);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message || 'Could not count media assets');
  }
  return count ?? 0;
}

function normalizeAssetEvent(row) {
  const meta = asObject(row.meta);
  return {
    source: 'asset',
    eventName: cleanText(row.event_name, 120),
    stage: inferStage({
      stage: meta.stage,
      eventName: row.event_name,
    }),
    surface: cleanNullableText(meta.surface, 120),
    assetId: cleanNullableText(row.asset_id, 80),
    requestId: null,
    pipeline: cleanNullableText(row.pipeline, 120),
    status: cleanNullableText(row.processing_state, 80),
    failureCode: cleanNullableText(row.failure_code, 120),
    failureReason: cleanNullableText(row.failure_reason, 500),
    createdAt: cleanNullableText(row.created_at, 80),
  };
}

function normalizeAuditEvent(row) {
  const meta = asObject(row.meta);
  return {
    source: cleanNullableText(meta.source, 40) ?? 'client',
    eventName: cleanText(meta.eventName, 120) || 'media_client_event',
    stage: inferStage({
      stage: meta.stage,
      eventName: meta.eventName,
    }),
    surface: cleanNullableText(meta.surface, 120),
    assetId: cleanNullableText(meta.assetId, 80),
    requestId: cleanNullableText(meta.requestId, 160),
    pipeline: cleanNullableText(meta.pipeline, 120),
    status: cleanNullableText(meta.status, 80),
    failureCode: cleanNullableText(meta.failureCode, 120),
    failureReason: cleanNullableText(meta.failureReason, 500),
    createdAt: cleanNullableText(row.created_at, 80),
  };
}

export async function fetchAdminMediaHealthSnapshot(supabase, options = {}) {
  const windowHours = Math.min(
    168,
    Math.max(1, Number(options.windowHours) || 72),
  );
  const generatedAt = new Date().toISOString();
  const eventsSince = new Date(
    Date.now() - windowHours * 60 * 60 * 1000,
  ).toISOString();
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const [
    totalActive,
    pending,
    uploading,
    processing,
    ready,
    failed,
    staleProcessing,
    assetEventRes,
    auditEventRes,
  ] = await Promise.all([
    countMediaAssets(supabase),
    countMediaAssets(supabase, { processingState: 'pending' }),
    countMediaAssets(supabase, { processingState: 'uploading' }),
    countMediaAssets(supabase, { processingState: 'processing' }),
    countMediaAssets(supabase, { processingState: 'ready' }),
    countMediaAssets(supabase, { processingState: 'failed' }),
    countMediaAssets(supabase, {
      processingState: 'processing',
      updatedBefore: staleBefore,
    }),
    supabase
      .from('media_asset_events')
      .select(
        'asset_id, event_name, pipeline, processing_state, failure_code, failure_reason, meta, created_at',
      )
      .gte('created_at', eventsSince)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('audit_log')
      .select('target_id, meta, created_at')
      .eq('action', 'MEDIA_CLIENT_TELEMETRY')
      .gte('created_at', eventsSince)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (assetEventRes.error) {
    throw new Error(
      assetEventRes.error.message || 'Could not load media events',
    );
  }
  if (auditEventRes.error) {
    throw new Error(
      auditEventRes.error.message || 'Could not load media telemetry audits',
    );
  }

  const events = [
    ...(assetEventRes.data ?? []).map((row) => normalizeAssetEvent(row)),
    ...(auditEventRes.data ?? []).map((row) => normalizeAuditEvent(row)),
  ];

  return summarizeMediaHealth({
    generatedAt,
    windowHours,
    assetSummary: {
      totalActive,
      pending,
      uploading,
      processing,
      staleProcessing,
      ready,
      failed,
    },
    events,
  });
}

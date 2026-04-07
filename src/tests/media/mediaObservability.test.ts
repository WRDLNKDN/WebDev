import { describe, expect, it } from 'vitest';
import {
  normalizeClientMediaTelemetryPayload,
  summarizeMediaHealth,
} from '../../../backend/lib/mediaObservability.js';

describe('media observability summary', () => {
  it('normalizes client telemetry payloads into structured media events', () => {
    const [event] = normalizeClientMediaTelemetryPayload({
      event: {
        eventName: 'gif_picker_search_failed',
        stage: 'preview',
        surface: 'shared_gif_picker',
        requestId: 'medium:cats',
        failureCode: 'gif_search_failed',
        failureReason: 'GIF search failed.',
        meta: { query: 'cats' },
      },
    });

    expect(event).toMatchObject({
      source: 'client',
      eventName: 'gif_picker_search_failed',
      stage: 'preview',
      surface: 'shared_gif_picker',
      requestId: 'medium:cats',
      failureCode: 'gif_search_failed',
      failureReason: 'GIF search failed.',
    });
  });

  it('rolls up stage, failure, and surface metrics across client and asset events', () => {
    const summary = summarizeMediaHealth({
      generatedAt: '2026-04-01T00:00:00.000Z',
      windowHours: 72,
      assetSummary: {
        totalActive: 14,
        pending: 1,
        uploading: 1,
        processing: 2,
        staleProcessing: 1,
        ready: 8,
        failed: 2,
      },
      events: [
        {
          source: 'asset',
          eventName: 'asset_registered',
          stage: 'upload',
          surface: 'feed_post_image',
          assetId: 'asset-1',
          requestId: null,
          pipeline: 'feed_media',
          status: 'ready',
          failureCode: null,
          failureReason: null,
          createdAt: '2026-04-01T00:05:00.000Z',
        },
        {
          source: 'client',
          eventName: 'gif_picker_search_failed',
          stage: 'preview',
          surface: 'shared_gif_picker',
          assetId: null,
          requestId: 'medium:cats',
          pipeline: 'gif_picker',
          status: 'failed',
          failureCode: 'gif_search_failed',
          failureReason: 'GIF search failed.',
          createdAt: '2026-04-01T00:06:00.000Z',
        },
        {
          source: 'client',
          eventName: 'media_render_failed',
          stage: 'render',
          surface: 'feed',
          assetId: 'asset-2',
          requestId: null,
          pipeline: 'asset_renderer',
          status: 'failed',
          failureCode: 'media_render_failed',
          failureReason: 'The display derivative failed to render.',
          createdAt: '2026-04-01T00:07:00.000Z',
        },
      ],
    });

    expect(summary.assetSummary.failed).toBe(2);
    expect(summary.pipelineCoverage.pipelineEvents).toBe(1);
    expect(summary.pipelineCoverage.clientEvents).toBe(2);
    expect(summary.failureMetrics.previewFailures).toBe(1);
    expect(summary.failureMetrics.renderFailures).toBe(1);
    expect(summary.failureMetrics.gifFailures).toBe(1);
    expect(summary.recentFailures[0]).toMatchObject({
      eventName: 'media_render_failed',
      surface: 'feed',
    });
    expect(
      summary.stageMetrics.find(
        (metric: { stage: string }) => metric.stage === 'preview',
      ),
    ).toMatchObject({
      totalEvents: 1,
      failureEvents: 1,
    });
  });

  it('classifies media_render_fallback_visible as render-stage telemetry', () => {
    const [event] = normalizeClientMediaTelemetryPayload({
      event: {
        eventName: 'media_render_fallback_visible',
        surface: 'feed',
        assetId: 'asset-fb',
        pipeline: 'asset_renderer',
        status: 'fallback',
        meta: { missingDisplayDerivative: true },
      },
    });
    expect(event?.stage).toBe('render');

    const summary = summarizeMediaHealth({
      generatedAt: '2026-04-01T00:00:00.000Z',
      windowHours: 24,
      assetSummary: {
        totalActive: 0,
        pending: 0,
        uploading: 0,
        processing: 0,
        staleProcessing: 0,
        ready: 0,
        failed: 0,
      },
      events: [
        {
          source: 'client',
          eventName: 'media_render_fallback_visible',
          stage: event?.stage ?? 'render',
          surface: 'feed',
          assetId: 'asset-fb',
          requestId: null,
          pipeline: 'asset_renderer',
          status: 'fallback',
          failureCode: null,
          failureReason: null,
          createdAt: '2026-04-01T00:08:00.000Z',
        },
      ],
    });

    const renderStage = summary.stageMetrics.find(
      (metric: { stage: string }) => metric.stage === 'render',
    );
    expect(renderStage).toMatchObject({
      totalEvents: 1,
      failureEvents: 1,
    });
    expect(summary.failureMetrics.renderFailures).toBe(1);
  });
});

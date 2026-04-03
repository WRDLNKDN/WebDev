import { describe, expect, it } from 'vitest';
import {
  buildQuarantinedFailure,
  resolveMediaModeration,
  runMediaSafetyCheck,
} from '../../../backend/lib/mediaModeration.js';

describe('media moderation hooks', () => {
  it('marks gif provider assets as passed through the provider safety hook by default', () => {
    expect(
      runMediaSafetyCheck({
        sourceType: 'gif_provider',
        source: {
          externalUrl: 'https://giphy.com/gifs/example',
        },
        metadata: {},
      }),
    ).toMatchObject({
      provider: 'giphy',
      hookStatus: 'passed',
    });
  });

  it('quarantines assets when a provider safety decision blocks rendering', () => {
    const result = resolveMediaModeration({
      requestedStatus: null,
      requestedModeration: null,
      abuseReportRef: {
        reportId: 'report-1',
      },
      safetyDecision: {
        provider: 'scanner',
        hookStatus: 'blocked',
        reason: 'Unsafe content detected.',
        unsafeReasons: ['unsafe_content'],
      },
    });

    expect(result.moderationStatus).toBe('quarantined');
    expect(result.moderation.safeToRender).toBe(false);
    expect(result.moderation.abuseReport?.reportId).toBe('report-1');
    expect(result.moderation.unsafeReasons).toContain('unsafe_content');
  });

  it('builds a generic quarantined failure payload for user-facing surfaces', () => {
    expect(
      buildQuarantinedFailure({
        detail: 'Unsafe content detected.',
      }),
    ).toMatchObject({
      code: 'MEDIA_QUARANTINED',
      reason: 'This media is unavailable.',
      stage: 'moderation',
      retryable: false,
    });
  });
});

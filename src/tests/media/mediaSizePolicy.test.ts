import { describe, expect, it } from 'vitest';
import {
  classifyMimeForMediaPolicy,
  getUploadSizeDecision,
  MEDIA_COMPRESSION_DECISION_TREE,
  PLATFORM_UPLOAD_ABSOLUTE_CEILING_BYTES,
} from '../../lib/media/mediaSizePolicy';
describe('central media size policy', () => {
  it('classifies MIME types for telemetry and policy docs', () => {
    expect(classifyMimeForMediaPolicy('image/png')).toBe('raster_image');
    expect(classifyMimeForMediaPolicy('image/gif')).toBe('animated_gif');
    expect(classifyMimeForMediaPolicy('application/pdf')).toBe('pdf');
    expect(classifyMimeForMediaPolicy('video/mp4')).toBe('video');
  });

  it('exposes a stable compression decision tree with platform ceilings', () => {
    expect(MEDIA_COMPRESSION_DECISION_TREE.version).toBe(1);
    expect(MEDIA_COMPRESSION_DECISION_TREE.absoluteCeilingBytes).toBe(
      PLATFORM_UPLOAD_ABSOLUTE_CEILING_BYTES,
    );
    expect(
      MEDIA_COMPRESSION_DECISION_TREE.byAssetClass.raster_image
        .transformBeforeReject,
    ).toBe(true);
  });

  it('returns stable rejection codes for hard-cap failures', () => {
    const over = 20 * 1024 * 1024;
    const decision = getUploadSizeDecision({
      surface: 'feed_post_image',
      size: over,
      mimeType: 'image/jpeg',
    });
    expect(decision.accepted).toBe(false);
    if (!decision.accepted) {
      expect(decision.rejectionCode).toBe('hard_cap_transformable_media');
    }
  });
});

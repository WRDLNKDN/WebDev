import { describe, expect, it } from 'vitest';
import {
  buildLegacyMediaBackfillPlan,
  createLegacyPlatformMediaAsset,
  LEGACY_MEDIA_ROLLOUT_CHECKLIST,
  LEGACY_MEDIA_SURFACE_AUDIT,
} from '../../lib/media/legacyCompatibility';
import {
  createNormalizedAssetFromPlatformMediaAsset,
  createNormalizedFeedImageAsset,
  createNormalizedGifAsset,
  createNormalizedResumeAsset,
} from '../../lib/media/assets';

describe('legacy media compatibility', () => {
  it('maps legacy feed attachments into the unified asset model', () => {
    const asset = createLegacyPlatformMediaAsset({
      kind: 'feed_attachment',
      imageUrl:
        'https://example.supabase.co/storage/v1/object/public/feed-post-images/user-1/posts/asset-1/display.webp',
    });

    expect(asset.sourceType).toBe('upload');
    expect(asset.mediaType).toBe('image');
    expect(asset.metadata.surface).toBe('feed');
    expect(asset.derivatives.display?.storageBucket).toBe('feed-post-images');
    expect(asset.rendering.thumbnailUrl).toContain('/thumbnail.jpg');
  });

  it('marks legacy resumes without thumbnails for backfill', () => {
    const backfillPlan = buildLegacyMediaBackfillPlan({
      kind: 'profile_resume',
      url: 'https://example.supabase.co/storage/v1/object/public/resumes/user-1/resume.pdf',
      fileName: 'Resume.pdf',
      thumbnailUrl: null,
      thumbnailStatus: 'pending',
    });

    expect(backfillPlan.needsAssetBackfill).toBe(true);
    expect(backfillPlan.needsThumbnailBackfill).toBe(true);
    expect(backfillPlan.compatibilityMode).toBe('legacy_adapter');
    expect(backfillPlan.deprecatedHandlers).toContain(
      'profiles.resume_url direct rendering',
    );
  });

  it('treats storage-path-only chat attachments as signed delivery assets', () => {
    const asset = createLegacyPlatformMediaAsset({
      kind: 'chat_attachment',
      attachment: {
        id: 'attachment-1',
        message_id: 'message-1',
        storage_path: 'user-1/attachments/asset-1/original.docx',
        mime_type:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 2048,
        created_at: '2026-04-01T12:00:00.000Z',
      },
    });

    expect(asset.delivery.original?.visibility).toBe('signed');
    expect(asset.delivery.thumbnail?.cacheProfile).toBe('signed_short');
    expect(asset.mediaType).toBe('doc');
  });

  it('keeps normalized wrappers aligned with the compatibility adapter', () => {
    const unified = createLegacyPlatformMediaAsset({
      kind: 'feed_attachment',
      imageUrl:
        'https://example.supabase.co/storage/v1/object/public/feed-post-images/user-1/posts/asset-2/display.webp',
    });
    const normalizedFromPlatform =
      createNormalizedAssetFromPlatformMediaAsset(unified);
    const normalizedFromWrapper = createNormalizedFeedImageAsset(
      'https://example.supabase.co/storage/v1/object/public/feed-post-images/user-1/posts/asset-2/display.webp',
    );

    expect(normalizedFromWrapper.displayUrl).toBe(
      normalizedFromPlatform.displayUrl,
    );
    expect(normalizedFromWrapper.thumbnailUrl).toBe(
      normalizedFromPlatform.thumbnailUrl,
    );
  });

  it('normalizes legacy GIF and resume wrappers through the shared adapter', () => {
    const gifAsset = createNormalizedGifAsset({
      url: 'https://media.giphy.com/media/test/giphy.gif',
      surface: 'feed',
    });
    const resumeAsset = createNormalizedResumeAsset({
      url: 'https://example.supabase.co/storage/v1/object/public/resumes/user-1/resume.docx',
      fileName: 'Resume.docx',
      thumbnailUrl:
        'https://example.supabase.co/storage/v1/object/public/resumes/user-1/resume-thumbnail.jpg',
      thumbnailStatus: 'complete',
    });

    expect(gifAsset.mediaType).toBe('image');
    expect(gifAsset.provider).toBe('GIPHY');
    expect(resumeAsset?.mediaType).toBe('doc');
    expect(resumeAsset?.thumbnailUrl).toContain('resume-thumbnail.jpg');
  });

  it('exposes the full rollout audit and checklist inventory', () => {
    expect(LEGACY_MEDIA_SURFACE_AUDIT.map((entry) => entry.surface)).toEqual([
      'feed',
      'chat',
      'profile',
      'portfolio',
      'groups',
    ]);
    expect(
      LEGACY_MEDIA_ROLLOUT_CHECKLIST.find(
        (entry) => entry.surface === 'portfolio',
      )?.deprecatedHandlers,
    ).toContain('portfolio_items image_url/project_url/thumbnail_url triad');
  });
});

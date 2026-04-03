import { describe, expect, it } from 'vitest';
import {
  createNormalizedAssetFromPlatformMediaAsset,
  createNormalizedFeedImageAsset,
  createNormalizedLinkAsset,
  createNormalizedPortfolioAsset,
  createNormalizedResumeAsset,
  deriveSiblingPublicUrl,
  getNormalizedAssetThumbnailUrl,
} from '../../lib/media/assets';

describe('normalized media assets', () => {
  it('creates deterministic fallback thumbnails for links without og images', () => {
    const asset = createNormalizedLinkAsset({
      url: 'https://example.com/post',
      preview: {
        url: 'https://example.com/post',
        title: 'Example post',
      },
    });

    expect(asset.mediaType).toBe('link');
    expect(getNormalizedAssetThumbnailUrl(asset)).toContain(
      'data:image/svg+xml',
    );
  });

  it('derives feed thumbnail urls from structured display urls', () => {
    const asset = createNormalizedFeedImageAsset(
      'https://storage.example.com/feed-post-images/user-1/posts/asset-1/display.webp',
    );

    expect(asset.displayUrl).toContain('/display.webp');
    expect(asset.thumbnailUrl).toContain('/thumbnail.jpg');
  });

  it('derives structured project display and thumbnail urls from original uploads', () => {
    const asset = createNormalizedPortfolioAsset({
      id: 'project-1',
      owner_id: 'user-1',
      title: 'Portfolio image',
      description: null,
      image_url: null,
      project_url:
        'https://storage.example.com/project-sources/user-1/project-source/asset-1/original.png',
      tech_stack: [],
      created_at: '2026-03-29T00:00:00.000Z',
      resolved_type: 'image',
      thumbnail_url: null,
      thumbnail_status: null,
    });

    expect(asset.mediaType).toBe('image');
    expect(asset.displayUrl).toContain('/display.webp');
    expect(asset.thumbnailUrl).toContain('/thumbnail.jpg');
    expect(asset.originalUrl).toContain('/original.png');
  });

  it('derives svg document previews from structured project uploads', () => {
    const asset = createNormalizedPortfolioAsset({
      id: 'project-2',
      owner_id: 'user-1',
      title: 'Project deck',
      description: null,
      image_url: null,
      project_url:
        'https://storage.example.com/project-sources/user-1/project-source/asset-2/original.pptx',
      tech_stack: [],
      created_at: '2026-03-29T00:00:00.000Z',
      resolved_type: 'presentation',
      thumbnail_url: null,
      thumbnail_status: null,
    });

    expect(asset.mediaType).toBe('doc');
    expect(asset.displayUrl).toContain('/display.svg');
    expect(asset.thumbnailUrl).toContain('/thumbnail.svg');
  });

  it('maps pending resume thumbnails to converting state', () => {
    const asset = createNormalizedResumeAsset({
      url: 'https://storage.example.com/resumes/user-1/resume.pdf',
      fileName: 'Resume.pdf',
      thumbnailStatus: 'pending',
    });

    expect(asset?.mediaType).toBe('doc');
    expect(asset?.processingState).toBe('converting');
  });

  it('maps quarantined platform assets to failed normalized placeholders', () => {
    const asset = createNormalizedAssetFromPlatformMediaAsset({
      assetId: 'asset-quarantined',
      sourceType: 'upload',
      mediaType: 'image',
      processingState: 'ready',
      moderationStatus: 'quarantined',
      moderation: {
        safeToRender: false,
      },
      rendering: {
        originalUrl: null,
        displayUrl: null,
        thumbnailUrl: null,
        primaryUrl: null,
        previewUrl: null,
        posterUrl: null,
        downloadUrl: null,
      },
      derivatives: {
        original: null,
        display: null,
        thumbnail: null,
      },
      source: {
        mimeType: 'image/png',
      },
      metadata: {
        title: 'Blocked image',
      },
      failure: null,
      createdAt: '2026-04-01T12:00:00.000Z',
      updatedAt: '2026-04-01T12:00:00.000Z',
    });

    expect(asset.processingState).toBe('failed');
    expect(asset.safeToRender).toBe(false);
    expect(asset.failureMessage).toBe('This media is unavailable.');
    expect(getNormalizedAssetThumbnailUrl(asset)).toContain(
      'data:image/svg+xml',
    );
  });

  it('replaces the terminal file name without disturbing query strings or fragments', () => {
    expect(
      deriveSiblingPublicUrl(
        'https://storage.example.com/path/original.png?token=abc#preview',
        'thumbnail',
        'jpg',
      ),
    ).toBe('https://storage.example.com/path/thumbnail.jpg?token=abc#preview');
  });
});

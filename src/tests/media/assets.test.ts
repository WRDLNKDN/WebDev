import { describe, expect, it } from 'vitest';
import {
  createNormalizedFeedImageAsset,
  createNormalizedLinkAsset,
  createNormalizedPortfolioAsset,
  createNormalizedResumeAsset,
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

  it('maps pending resume thumbnails to converting state', () => {
    const asset = createNormalizedResumeAsset({
      url: 'https://storage.example.com/resumes/user-1/resume.pdf',
      fileName: 'Resume.pdf',
      thumbnailStatus: 'pending',
    });

    expect(asset?.mediaType).toBe('doc');
    expect(asset?.processingState).toBe('converting');
  });
});

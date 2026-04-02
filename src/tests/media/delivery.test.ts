import { describe, expect, it } from 'vitest';
import { buildPlatformMediaRenderingReferences } from '../../lib/media/contract';
import {
  buildPlatformMediaDelivery,
  buildPlatformMediaLifecycle,
  bumpPlatformMediaDeliveryVersion,
} from '../../lib/media/delivery';
// @ts-expect-error backend helper is validated separately via node --check.
import { buildMediaDeliveryMetadata } from '../../../backend/lib/mediaDelivery.js';
// @ts-expect-error backend helper is validated separately via node --check.
import { __mediaServiceInternals } from '../../../backend/lib/mediaService.js';

const PUBLIC_BASE_URL =
  'https://cdn.example.com/storage/v1/object/public/feed-post-images/user-1/posts/asset-1';
const PRIVATE_BASE_PATH = 'user-1/attachments/asset-2';

describe('platform media delivery', () => {
  it('adds cache-busting tokens to immutable public derivatives', () => {
    const delivery = buildPlatformMediaDelivery({
      assetId: 'asset-1',
      sourceType: 'upload',
      mediaType: 'image',
      source: {
        storagePath: `${PUBLIC_BASE_URL.replace(
          'https://cdn.example.com/storage/v1/object/public/feed-post-images/',
          '',
        )}/original.png`,
      },
      derivatives: {
        original: {
          kind: 'original',
          url: `${PUBLIC_BASE_URL}/original.png`,
          storagePath: 'user-1/posts/asset-1/original.png',
        },
        display: {
          kind: 'display',
          url: `${PUBLIC_BASE_URL}/display.webp`,
          storagePath: 'user-1/posts/asset-1/display.webp',
        },
        thumbnail: {
          kind: 'thumbnail',
          url: `${PUBLIC_BASE_URL}/thumbnail.jpg`,
          storagePath: 'user-1/posts/asset-1/thumbnail.jpg',
        },
      },
      updatedAt: '2026-04-01T12:00:00.000Z',
    });

    const rendering = buildPlatformMediaRenderingReferences({
      mediaType: 'image',
      source: {},
      derivatives: {
        original: {
          kind: 'original',
          url: `${PUBLIC_BASE_URL}/original.png`,
        },
        display: {
          kind: 'display',
          url: `${PUBLIC_BASE_URL}/display.webp`,
        },
        thumbnail: {
          kind: 'thumbnail',
          url: `${PUBLIC_BASE_URL}/thumbnail.jpg`,
        },
      },
      delivery,
    });

    expect(delivery.display?.cacheProfile).toBe('immutable');
    expect(rendering.displayUrl).toContain(
      `v=${delivery.display?.invalidationToken}`,
    );
    expect(rendering.thumbnailUrl).toContain(
      `v=${delivery.thumbnail?.invalidationToken}`,
    );
  });

  it('marks storage-path-only attachments as signed and short-lived', () => {
    const delivery = buildPlatformMediaDelivery({
      assetId: 'asset-2',
      sourceType: 'upload',
      mediaType: 'image',
      source: {
        storagePath: `${PRIVATE_BASE_PATH}/original.png`,
      },
      derivatives: {
        original: {
          kind: 'original',
          storagePath: `${PRIVATE_BASE_PATH}/original.png`,
        },
        display: {
          kind: 'display',
          storagePath: `${PRIVATE_BASE_PATH}/display.webp`,
        },
        thumbnail: {
          kind: 'thumbnail',
          storagePath: `${PRIVATE_BASE_PATH}/thumbnail.jpg`,
        },
      },
      updatedAt: '2026-04-01T12:00:00.000Z',
    });

    expect(delivery.original?.visibility).toBe('signed');
    expect(delivery.display?.cacheProfile).toBe('signed_short');
    expect(delivery.thumbnail?.signedUrlTtlSeconds).toBe(300);
  });

  it('retains failed assets for seven days and keeps them reprocessable', () => {
    const lifecycle = buildPlatformMediaLifecycle({
      sourceType: 'upload',
      processingState: 'failed',
      failure: {
        reason: 'Derivative generation timed out.',
        failedAt: '2026-04-01T10:00:00.000Z',
      },
      updatedAt: '2026-04-01T10:00:00.000Z',
    });

    expect(lifecycle.cleanupState).toBe('failed_retained');
    expect(lifecycle.cleanupAfter).toBe('2026-04-08T10:00:00.000Z');
    expect(lifecycle.reprocessEligible).toBe(true);
    expect(lifecycle.reprocessState).toBe('failed');
  });

  it('bumps delivery versions when an override needs cache invalidation', () => {
    const initial = buildPlatformMediaDelivery({
      assetId: 'asset-3',
      sourceType: 'upload',
      mediaType: 'image',
      source: {
        storagePath: 'user-1/posts/asset-3/original.png',
      },
      derivatives: {
        original: {
          kind: 'original',
          url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-3')}/original.png`,
          storagePath: 'user-1/posts/asset-3/original.png',
        },
        display: {
          kind: 'display',
          url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-3')}/display.webp`,
          storagePath: 'user-1/posts/asset-3/display.webp',
        },
        thumbnail: {
          kind: 'thumbnail',
          url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-3')}/thumbnail.jpg`,
          storagePath: 'user-1/posts/asset-3/thumbnail.jpg',
        },
      },
      updatedAt: '2026-04-01T12:00:00.000Z',
    });

    const bumped = bumpPlatformMediaDeliveryVersion(initial, {
      assetId: 'asset-3',
      updatedAt: '2026-04-02T15:30:00.000Z',
    });

    expect(bumped.storageVersion).toBe(2);
    expect(bumped.invalidationToken).not.toBe(initial.invalidationToken);
    expect(bumped.display?.invalidationToken).toBe(bumped.invalidationToken);
  });

  it('keeps backend rendering aligned with the shared delivery token strategy', () => {
    const delivery = buildMediaDeliveryMetadata({
      assetId: 'asset-4',
      sourceType: 'upload',
      mediaType: 'image',
      source: {
        storagePath: 'user-1/posts/asset-4/original.png',
      },
      derivatives: {
        original: {
          kind: 'original',
          url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-4')}/original.png`,
          storagePath: 'user-1/posts/asset-4/original.png',
        },
        display: {
          kind: 'display',
          url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-4')}/display.webp`,
          storagePath: 'user-1/posts/asset-4/display.webp',
        },
        thumbnail: {
          kind: 'thumbnail',
          url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-4')}/thumbnail.jpg`,
          storagePath: 'user-1/posts/asset-4/thumbnail.jpg',
        },
      },
      updatedAt: '2026-04-01T12:00:00.000Z',
    });

    const rendering = __mediaServiceInternals.buildMediaRenderingReferences({
      mediaType: 'image',
      source: {},
      original: {
        kind: 'original',
        url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-4')}/original.png`,
      },
      display: {
        kind: 'display',
        url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-4')}/display.webp`,
      },
      thumbnail: {
        kind: 'thumbnail',
        url: `${PUBLIC_BASE_URL.replace('asset-1', 'asset-4')}/thumbnail.jpg`,
      },
      delivery,
    });

    expect(rendering.displayUrl).toContain(
      `v=${delivery.display?.invalidationToken}`,
    );
    expect(rendering.previewUrl).toContain(
      `v=${delivery.thumbnail?.invalidationToken}`,
    );
  });

  it('suppresses renderable urls when an asset is quarantined', () => {
    const rendering = buildPlatformMediaRenderingReferences({
      mediaType: 'image',
      source: {
        externalUrl: `${PUBLIC_BASE_URL}/original.png`,
      },
      derivatives: {
        original: {
          kind: 'original',
          url: `${PUBLIC_BASE_URL}/original.png`,
        },
        display: {
          kind: 'display',
          url: `${PUBLIC_BASE_URL}/display.webp`,
        },
        thumbnail: {
          kind: 'thumbnail',
          url: `${PUBLIC_BASE_URL}/thumbnail.jpg`,
        },
      },
      moderationStatus: 'quarantined',
      moderation: {
        safeToRender: false,
      },
    });

    expect(rendering.displayUrl).toBeNull();
    expect(rendering.thumbnailUrl).toBeNull();

    const backendRendering =
      __mediaServiceInternals.buildMediaRenderingReferences({
        mediaType: 'image',
        source: {
          externalUrl: `${PUBLIC_BASE_URL}/original.png`,
        },
        original: {
          kind: 'original',
          url: `${PUBLIC_BASE_URL}/original.png`,
        },
        display: {
          kind: 'display',
          url: `${PUBLIC_BASE_URL}/display.webp`,
        },
        thumbnail: {
          kind: 'thumbnail',
          url: `${PUBLIC_BASE_URL}/thumbnail.jpg`,
        },
        moderationStatus: 'quarantined',
        moderation: {
          safeToRender: false,
        },
      });

    expect(backendRendering.displayUrl).toBeNull();
    expect(backendRendering.previewUrl).toBeNull();
  });
});

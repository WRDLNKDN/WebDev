import type { LinkPreviewData } from '../linkPreview';
import type { ChatMessageAttachment, ChatRoom } from '../../types/chat';
import type { PortfolioItem } from '../../types/portfolio';
import type {
  PlatformMediaAsset,
  PlatformMediaDerivativeReference,
  PlatformMediaFailureMetadata,
  PlatformMediaMetadata,
  PlatformMediaProcessingState,
  PlatformMediaType,
} from './contract';
import { buildPlatformMediaRenderingReferences } from './contract';
import {
  buildPlatformMediaDelivery,
  buildPlatformMediaLifecycle,
} from './delivery';
import { buildDocumentPreviewDataUrl, detectDocumentKind } from './documents';

function buildLegacyModerationState() {
  return {
    moderationStatus: 'approved' as const,
    moderation: {
      source: 'legacy_migration',
      safeToRender: true,
      reviewedAt: new Date().toISOString(),
      hookStatus: 'not_run' as const,
    },
  };
}

export type LegacyMediaSurface =
  | 'feed'
  | 'chat'
  | 'profile'
  | 'portfolio'
  | 'groups';

export type LegacyMediaSurfaceAudit = {
  surface: LegacyMediaSurface;
  assetTypes: string[];
  storageBuckets: string[];
  legacyFields: string[];
  renderPaths: string[];
  notes: string;
};

export type LegacyMediaRolloutChecklistItem = {
  surface: LegacyMediaSurface;
  compatibilityAdapter: string;
  backfillFocus: string[];
  cutoverTask: string;
  deprecatedHandlers: string[];
};

export type LegacyMediaBackfillPlan = {
  needsAssetBackfill: boolean;
  needsDisplayBackfill: boolean;
  needsThumbnailBackfill: boolean;
  needsMetadataBackfill: boolean;
  needsLinkPreviewBackfill: boolean;
  needsGifReprocessing: boolean;
  reprocessReason: string | null;
  compatibilityMode: 'legacy_adapter' | 'ready_for_cutover';
  deprecatedHandlers: string[];
};

export const LEGACY_MEDIA_SURFACE_AUDIT: readonly LegacyMediaSurfaceAudit[] = [
  {
    surface: 'feed',
    assetTypes: ['post image_urls', 'body GIF URLs', 'link_preview payloads'],
    storageBuckets: ['feed-post-images'],
    legacyFields: [
      'feed_items.payload.image_urls',
      'feed_items.payload.link_preview',
    ],
    renderPaths: [
      'src/pages/feed/feedCard.tsx',
      'src/pages/feed/feedCardPostContent.tsx',
      'src/components/media/LinkPreviewCard.tsx',
    ],
    notes:
      'Feed still mixes inline GIF URLs, payload link previews, and bucket-hosted image attachments.',
  },
  {
    surface: 'chat',
    assetTypes: [
      'message attachments',
      'signed document/image previews',
      'chat GIF uploads',
    ],
    storageBuckets: ['chat-attachments'],
    legacyFields: [
      'chat_message_attachments.storage_path',
      'chat_messages.content',
    ],
    renderPaths: [
      'src/components/chat/message/AttachmentPreview.tsx',
      'src/components/chat/message/MessageList.tsx',
    ],
    notes:
      'Chat derives signed URLs at render time and still treats attachment rows as storage-path-first records.',
  },
  {
    surface: 'profile',
    assetTypes: [
      'resume original files',
      'resume preview thumbnails',
      'avatar uploads',
    ],
    storageBuckets: ['resumes', 'avatars'],
    legacyFields: [
      'profiles.resume_url',
      'profiles.nerd_creds.resume_*',
      'profiles.avatar',
    ],
    renderPaths: [
      'src/hooks/profile/useProfileAssets.ts',
      'src/components/portfolio/cards/ResumeCard.tsx',
    ],
    notes:
      'Resume metadata is split across profile columns and nerd_creds JSON while previews are backfilled separately.',
  },
  {
    surface: 'portfolio',
    assetTypes: [
      'project source uploads',
      'manual project images',
      'generated thumbnails',
    ],
    storageBuckets: [
      'project-sources',
      'project-images',
      'portfolio-thumbnails',
    ],
    legacyFields: [
      'portfolio_items.project_url',
      'portfolio_items.image_url',
      'portfolio_items.thumbnail_url',
      'portfolio_items.thumbnail_status',
    ],
    renderPaths: [
      'src/pages/profile/ProjectPage.tsx',
      'src/components/portfolio/cards/ProjectCard.tsx',
      'src/lib/portfolio/projectMedia.ts',
    ],
    notes:
      'Portfolio rows still depend on three separate URL fields plus thumbnail_status to resolve preview behavior.',
  },
  {
    surface: 'groups',
    assetTypes: ['group avatars'],
    storageBuckets: ['group image URLs on chat_rooms.image_url'],
    legacyFields: ['chat_rooms.image_url'],
    renderPaths: [
      'src/components/chat/room/ChatRoomHeader.tsx',
      'src/components/chat/room/ChatRoomRow.tsx',
      'src/pages/community/GroupsPage.tsx',
    ],
    notes:
      'Group images still render straight from chat_rooms.image_url and need compatibility mapping before cutover.',
  },
] as const;

export const LEGACY_MEDIA_ROLLOUT_CHECKLIST: readonly LegacyMediaRolloutChecklistItem[] =
  [
    {
      surface: 'feed',
      compatibilityAdapter:
        'legacy feed attachments, GIF URLs, and link previews',
      backfillFocus: [
        'promote payload image_urls into asset rows',
        'refresh missing link preview metadata',
        'queue GIF thumbnails where body URLs lack posters',
      ],
      cutoverTask:
        'Switch Feed cards to consume media_assets references from payloads instead of legacy image_urls/link_preview fields.',
      deprecatedHandlers: [
        'feed_items.payload.image_urls rendering',
        'inline GIPHY URL parsing in post bodies',
        'surface-owned link preview fallback fetches',
      ],
    },
    {
      surface: 'chat',
      compatibilityAdapter: 'legacy chat attachment storage descriptors',
      backfillFocus: [
        'materialize asset rows for chat_message_attachments',
        'backfill thumbnails for old docs and GIFs',
        'queue derivative regeneration for GIF uploads without posters',
      ],
      cutoverTask:
        'Store media asset ids on chat attachments/messages and stop resolving signed URLs ad hoc in the component tree.',
      deprecatedHandlers: [
        'AttachmentPreview signed URL resolver',
        'storage_path-first attachment rendering',
      ],
    },
    {
      surface: 'profile',
      compatibilityAdapter:
        'resume compatibility mapping from resume_url + nerd_creds',
      backfillFocus: [
        'generate missing resume thumbnails',
        'backfill original/display/thumbnail refs for Word resumes',
        'promote resume metadata into media asset rows',
      ],
      cutoverTask:
        'Persist a canonical resume asset reference on profile records and retire split resume thumbnail fields in nerd_creds.',
      deprecatedHandlers: [
        'profiles.resume_url direct rendering',
        'nerd_creds resume thumbnail sidecar fields',
      ],
    },
    {
      surface: 'portfolio',
      compatibilityAdapter: 'portfolio project compatibility mapper',
      backfillFocus: [
        'create assets for project_url/image_url/thumbnail_url triplets',
        'reprocess legacy document previews',
        'backfill metadata for external links and embedded assets',
      ],
      cutoverTask:
        'Move portfolio rows to a single media asset reference for previewable uploads while keeping external links as linked assets.',
      deprecatedHandlers: [
        'portfolio_items image_url/project_url/thumbnail_url triad',
        'thumbnail_status-driven preview branching',
      ],
    },
    {
      surface: 'groups',
      compatibilityAdapter: 'group image compatibility mapper',
      backfillFocus: [
        'materialize group image assets from chat_rooms.image_url',
        'backfill thumbnails for older uploaded group images',
      ],
      cutoverTask:
        'Store group image asset ids on chat rooms and remove direct image_url rendering after migration.',
      deprecatedHandlers: ['chat_rooms.image_url direct avatar rendering'],
    },
  ] as const;

export type LegacyFeedAttachmentRecord = {
  kind: 'feed_attachment';
  imageUrl: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  ownerId?: string | null;
};

export type LegacyGifRecord = {
  kind: 'gif';
  gifUrl: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  ownerId?: string | null;
  surface?: Extract<LegacyMediaSurface, 'feed' | 'chat'>;
};

export type LegacyLinkPreviewRecord = {
  kind: 'link_preview';
  url: string;
  preview?: Partial<LinkPreviewData> | null;
  title?: string | null;
  description?: string | null;
  ownerId?: string | null;
  surface?: Extract<LegacyMediaSurface, 'feed' | 'chat'>;
};

export type LegacyPortfolioProjectRecord = {
  kind: 'portfolio_project';
  project: PortfolioItem;
};

export type LegacyResumeRecord = {
  kind: 'profile_resume';
  ownerId?: string | null;
  url: string;
  fileName?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type LegacyGroupImageRecord = {
  kind: 'group_image';
  room: Pick<ChatRoom, 'id' | 'name' | 'image_url' | 'updated_at'>;
};

export type LegacyChatAttachmentRecord = {
  kind: 'chat_attachment';
  attachment: Pick<
    ChatMessageAttachment,
    | 'id'
    | 'message_id'
    | 'storage_path'
    | 'mime_type'
    | 'file_size'
    | 'created_at'
  >;
  resolvedUrls?: {
    originalUrl?: string | null;
    displayUrl?: string | null;
    thumbnailUrl?: string | null;
  };
};

export type LegacyMediaRecord =
  | LegacyFeedAttachmentRecord
  | LegacyGifRecord
  | LegacyLinkPreviewRecord
  | LegacyPortfolioProjectRecord
  | LegacyResumeRecord
  | LegacyGroupImageRecord
  | LegacyChatAttachmentRecord;

const DOC_FAILURE_REASON =
  'Legacy document preview is missing derivatives and should be reprocessed.';
const GIF_FAILURE_REASON =
  'Legacy GIF is missing preview derivatives and should be reprocessed.';

function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function cleanUrl(value: string | null | undefined): string | null {
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return null;
  }
}

function cleanIsoDate(value: string | null | undefined): string | null {
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function stableLegacyAssetId(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.trunc(hash * 31 + seed.charCodeAt(index));
  }
  return `legacy-${Math.abs(hash).toString(36)}`;
}

function isGiphyUrl(url: string | null): boolean {
  const candidate = url?.toLowerCase() ?? '';
  return (
    candidate.includes('giphy.com') ||
    candidate.includes('media.giphy.com') ||
    candidate.includes('gph.is')
  );
}

function getMediaExtensions(params: {
  mediaType: PlatformMediaType;
  mimeType?: string | null;
}): {
  displayExtension: 'gif' | 'png' | 'webp' | 'svg' | 'mp4';
  thumbnailExtension: 'jpg' | 'svg';
} {
  const mimeType = params.mimeType?.toLowerCase().trim() ?? '';
  if (params.mediaType === 'gif') {
    return {
      displayExtension: mimeType === 'video/mp4' ? 'mp4' : 'gif',
      thumbnailExtension: 'jpg',
    };
  }
  if (params.mediaType === 'image') {
    return {
      displayExtension: mimeType === 'image/png' ? 'png' : 'webp',
      thumbnailExtension: 'jpg',
    };
  }
  if (params.mediaType === 'video') {
    return {
      displayExtension: 'mp4',
      thumbnailExtension: 'jpg',
    };
  }
  return {
    displayExtension: 'svg',
    thumbnailExtension: 'svg',
  };
}

function replaceTerminalFileName(pathOrUrl: string, fileName: string): string {
  const clean = pathOrUrl.trim();
  if (!clean) return clean;
  const queryIndex = clean.indexOf('?');
  const hashIndex = clean.indexOf('#');
  const suffixStart = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .reduce((earliest, index) => Math.min(earliest, index), clean.length);
  const base = clean.slice(0, suffixStart);
  const suffix = clean.slice(suffixStart);
  const lastSlashIndex = base.lastIndexOf('/');
  if (lastSlashIndex < 0) return `${fileName}${suffix}`;
  return `${base.slice(0, lastSlashIndex + 1)}${fileName}${suffix}`;
}

function deriveSiblingUrl(
  url: string,
  nextStem: string,
  nextExtension: string,
): string {
  return replaceTerminalFileName(
    url,
    `${nextStem}.${nextExtension.replace(/^\./, '')}`,
  );
}

function deriveSiblingPath(
  storagePath: string,
  nextStem: string,
  nextExtension: string,
): string {
  return replaceTerminalFileName(
    storagePath,
    `${nextStem}.${nextExtension.replace(/^\./, '')}`,
  );
}

function parseStorageLocation(url: string | null): {
  bucket: string | null;
  path: string | null;
  mode: 'public' | 'sign' | null;
} {
  if (!url) {
    return {
      bucket: null,
      path: null,
      mode: null,
    };
  }
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) {
      return {
        bucket: null,
        path: null,
        mode: null,
      };
    }
    const remainder = parsed.pathname
      .slice(markerIndex + marker.length)
      .split('/')
      .filter(Boolean);
    if (remainder.length < 3) {
      return {
        bucket: null,
        path: null,
        mode: null,
      };
    }
    const [mode, bucket, ...pathParts] = remainder;
    return {
      bucket,
      path: pathParts.join('/'),
      mode: mode === 'public' || mode === 'sign' ? mode : null,
    };
  } catch {
    return {
      bucket: null,
      path: null,
      mode: null,
    };
  }
}

function extractOwnerId(params: {
  ownerId?: string | null;
  path?: string | null;
  url?: string | null;
  fallbackSeed: string;
}): string {
  const directOwner = cleanText(params.ownerId);
  if (directOwner) return directOwner;
  const path =
    cleanText(params.path) ?? parseStorageLocation(params.url ?? null).path;
  const firstSegment = path?.split('/').filter(Boolean)[0] ?? null;
  return firstSegment ?? `legacy-${stableLegacyAssetId(params.fallbackSeed)}`;
}

function inferLegacyMediaType(params: {
  mimeType?: string | null;
  url?: string | null;
  resolvedType?: string | null;
}): PlatformMediaType {
  const mime = params.mimeType?.toLowerCase().trim() ?? '';
  const resolvedType = params.resolvedType?.toLowerCase().trim() ?? '';
  const url = params.url?.toLowerCase().trim() ?? '';

  if (mime === 'image/gif' || resolvedType === 'gif' || isGiphyUrl(url)) {
    return 'gif';
  }
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (detectDocumentKind(params)) return 'doc';

  if (resolvedType === 'image') return 'image';
  if (resolvedType === 'video') return 'video';
  if (
    [
      'pdf',
      'document',
      'presentation',
      'spreadsheet',
      'text',
      'google_doc',
      'google_sheet',
      'google_slides',
    ].includes(resolvedType)
  ) {
    return 'doc';
  }

  if (/\.(gif)(?:$|\?)/i.test(url)) return 'gif';
  if (/\.(png|jpe?g|webp|avif|bmp|svg)(?:$|\?)/i.test(url)) return 'image';
  if (/\.(mp4|webm|mov)(?:$|\?)/i.test(url)) return 'video';
  if (
    /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|md)(?:$|\?)/i.test(url) ||
    url.includes('/storage/v1/object/public/resumes/')
  ) {
    return 'doc';
  }
  return 'link';
}

function mapLegacyStatusToProcessingState(params: {
  pending?: boolean;
  failed?: boolean;
}): PlatformMediaProcessingState {
  if (params.failed) return 'failed';
  if (params.pending) return 'processing';
  return 'ready';
}

function buildFallbackThumbnail(params: {
  mediaType: PlatformMediaType;
  title?: string | null;
  mimeType?: string | null;
}): string | null {
  if (params.mediaType === 'doc') {
    return buildDocumentPreviewDataUrl({
      title: params.title ?? 'Document preview',
      fileName: params.title ?? 'Document',
      mimeType: params.mimeType,
    });
  }
  return null;
}

function buildFailureMetadata(params: {
  mediaType: PlatformMediaType;
  processingState: PlatformMediaProcessingState;
  needsThumbnailBackfill: boolean;
}): PlatformMediaFailureMetadata | null {
  if (params.processingState !== 'failed') return null;
  if (params.mediaType === 'doc') {
    return {
      code: 'LEGACY_DOC_DERIVATIVES_MISSING',
      reason: DOC_FAILURE_REASON,
      stage: 'migration',
      retryable: true,
      failedAt: new Date().toISOString(),
    };
  }
  if (params.mediaType === 'gif') {
    return {
      code: 'LEGACY_GIF_DERIVATIVES_MISSING',
      reason: GIF_FAILURE_REASON,
      stage: 'migration',
      retryable: true,
      failedAt: new Date().toISOString(),
    };
  }
  if (params.needsThumbnailBackfill) {
    return {
      code: 'LEGACY_THUMBNAIL_MISSING',
      reason: 'Legacy asset is missing a preview derivative.',
      stage: 'migration',
      retryable: true,
      failedAt: new Date().toISOString(),
    };
  }
  return null;
}

function hasDerivative(
  reference: PlatformMediaDerivativeReference | null,
): boolean {
  return Boolean(reference?.url || reference?.storagePath);
}

function createFeedAttachmentAsset(
  record: LegacyFeedAttachmentRecord,
): PlatformMediaAsset {
  const displayUrl = cleanUrl(record.imageUrl);
  const storage = parseStorageLocation(displayUrl);
  const ownerId = extractOwnerId({
    ownerId: record.ownerId,
    path: storage.path,
    url: displayUrl,
    fallbackSeed: displayUrl ?? 'feed-attachment',
  });
  const assetId = stableLegacyAssetId(
    `feed:${displayUrl ?? 'missing'}:${ownerId}`,
  );
  const mediaType = inferLegacyMediaType({ url: displayUrl });
  const extensions = getMediaExtensions({ mediaType });
  const thumbnailUrl =
    displayUrl && /\/display\./.test(displayUrl)
      ? deriveSiblingUrl(displayUrl, 'thumbnail', extensions.thumbnailExtension)
      : displayUrl;
  const derivatives = {
    original: null,
    display: displayUrl
      ? {
          kind: 'display' as const,
          url: displayUrl,
          storageBucket: storage.bucket,
          storagePath: storage.path,
        }
      : null,
    thumbnail: thumbnailUrl
      ? {
          kind: 'thumbnail' as const,
          url: thumbnailUrl,
          storageBucket: storage.bucket,
          storagePath: storage.path
            ? deriveSiblingPath(
                storage.path,
                'thumbnail',
                extensions.thumbnailExtension,
              )
            : null,
        }
      : null,
  };
  const metadata: PlatformMediaMetadata = {
    surface: 'feed',
    parentType: 'feed_item',
    title: 'Feed attachment',
  };
  const delivery = buildPlatformMediaDelivery({
    assetId,
    sourceType: 'upload',
    mediaType,
    source: {
      externalUrl: displayUrl,
      storageBucket: storage.bucket,
      storagePath: storage.path,
    },
    derivatives,
    updatedAt: record.updatedAt ?? record.createdAt ?? null,
    createdAt: record.createdAt ?? null,
  });

  return {
    assetId,
    ownerId,
    sourceType: 'upload',
    mediaType,
    processingState: 'ready',
    source: {
      externalUrl: displayUrl,
      storageBucket: storage.bucket,
      storagePath: storage.path,
    },
    derivatives,
    rendering: buildPlatformMediaRenderingReferences({
      mediaType,
      source: {
        externalUrl: displayUrl,
        storageBucket: storage.bucket,
        storagePath: storage.path,
      },
      derivatives,
      delivery,
    }),
    delivery,
    fallback: {
      label: 'Feed attachment',
    },
    failure: null,
    lifecycle: buildPlatformMediaLifecycle({
      sourceType: 'upload',
      processingState: 'ready',
      metadata,
      updatedAt: record.updatedAt ?? record.createdAt ?? null,
      createdAt: record.createdAt ?? null,
    }),
    metadata,
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'feed',
      stage: 'compatibility_adapter',
      lastEvent: 'legacy_asset_mapped',
      lastEventAt: new Date().toISOString(),
      meta: {
        legacyKind: record.kind,
      },
    },
    ...buildLegacyModerationState(),
    retryCount: 0,
    createdAt: cleanIsoDate(record.createdAt) ?? new Date().toISOString(),
    updatedAt:
      cleanIsoDate(record.updatedAt ?? record.createdAt) ??
      new Date().toISOString(),
    deletedAt: null,
  };
}

function createGifAsset(record: LegacyGifRecord): PlatformMediaAsset {
  const gifUrl = cleanUrl(record.gifUrl);
  const storage = parseStorageLocation(gifUrl);
  const ownerId = extractOwnerId({
    ownerId: record.ownerId,
    path: storage.path,
    url: gifUrl,
    fallbackSeed: gifUrl ?? 'gif',
  });
  const assetId = stableLegacyAssetId(`gif:${gifUrl ?? 'missing'}:${ownerId}`);
  const metadata: PlatformMediaMetadata = {
    surface: record.surface ?? 'feed',
    parentType: record.surface === 'chat' ? 'chat_message' : 'feed_item',
    title: 'Legacy GIF',
    provider: isGiphyUrl(gifUrl) ? 'GIPHY' : null,
    mimeType: /\.mp4(?:$|\?)/i.test(gifUrl ?? '') ? 'video/mp4' : 'image/gif',
  };
  const thumbnailUrl =
    storage.path && gifUrl
      ? deriveSiblingUrl(gifUrl, 'thumbnail', 'jpg')
      : gifUrl;
  const sourceType = isGiphyUrl(gifUrl) ? 'gif_provider' : 'upload';
  const derivatives = {
    original: gifUrl
      ? {
          kind: 'original' as const,
          url: gifUrl,
          storageBucket: storage.bucket,
          storagePath: storage.path,
          mimeType: metadata.mimeType,
        }
      : null,
    display: gifUrl
      ? {
          kind: 'display' as const,
          url: gifUrl,
          storageBucket: storage.bucket,
          storagePath: storage.path,
          mimeType: metadata.mimeType,
        }
      : null,
    thumbnail: thumbnailUrl
      ? {
          kind: 'thumbnail' as const,
          url: thumbnailUrl,
          storageBucket: storage.bucket,
          storagePath: storage.path
            ? deriveSiblingPath(storage.path, 'thumbnail', 'jpg')
            : null,
          mimeType: 'image/jpeg',
        }
      : null,
  };
  const needsThumbnailBackfill = !hasDerivative(derivatives.thumbnail);
  const processingState = mapLegacyStatusToProcessingState({
    failed: needsThumbnailBackfill && sourceType === 'upload',
  });
  const failure = buildFailureMetadata({
    mediaType: 'gif',
    processingState,
    needsThumbnailBackfill,
  });
  const delivery = buildPlatformMediaDelivery({
    assetId,
    sourceType,
    mediaType: 'gif',
    source: {
      externalUrl: gifUrl,
      storageBucket: storage.bucket,
      storagePath: storage.path,
      mimeType: metadata.mimeType,
    },
    derivatives,
    updatedAt: record.updatedAt ?? record.createdAt ?? null,
    createdAt: record.createdAt ?? null,
  });

  return {
    assetId,
    ownerId,
    sourceType,
    mediaType: 'gif',
    processingState,
    source: {
      externalUrl: gifUrl,
      storageBucket: storage.bucket,
      storagePath: storage.path,
      mimeType: metadata.mimeType,
    },
    derivatives,
    rendering: buildPlatformMediaRenderingReferences({
      mediaType: 'gif',
      source: {
        externalUrl: gifUrl,
        storageBucket: storage.bucket,
        storagePath: storage.path,
      },
      derivatives,
      delivery,
    }),
    delivery,
    fallback: {
      label: 'GIF preview',
      ...(needsThumbnailBackfill
        ? { reason: 'Legacy GIF is missing a preview thumbnail.' }
        : {}),
    },
    failure,
    lifecycle: buildPlatformMediaLifecycle({
      sourceType,
      processingState,
      failure,
      metadata,
      updatedAt: record.updatedAt ?? record.createdAt ?? null,
      createdAt: record.createdAt ?? null,
    }),
    metadata,
    telemetry: {
      pipeline: 'legacy_migration',
      surface: record.surface ?? 'feed',
      stage: 'compatibility_adapter',
      lastEvent: 'legacy_asset_mapped',
      lastEventAt: new Date().toISOString(),
      meta: {
        legacyKind: record.kind,
      },
    },
    ...buildLegacyModerationState(),
    retryCount: 0,
    createdAt: cleanIsoDate(record.createdAt) ?? new Date().toISOString(),
    updatedAt:
      cleanIsoDate(record.updatedAt ?? record.createdAt) ??
      new Date().toISOString(),
    deletedAt: null,
  };
}

function createLinkPreviewAsset(
  record: LegacyLinkPreviewRecord,
): PlatformMediaAsset {
  const preview = record.preview ?? null;
  const url = cleanUrl(record.url);
  const previewImage = cleanUrl(preview?.image);
  const ownerId = extractOwnerId({
    ownerId: record.ownerId,
    url,
    fallbackSeed: url ?? 'link-preview',
  });
  const assetId = stableLegacyAssetId(`link:${url ?? 'missing'}:${ownerId}`);
  const metadata: PlatformMediaMetadata = {
    surface: record.surface ?? 'feed',
    parentType: record.surface === 'chat' ? 'chat_message' : 'feed_item',
    title: cleanText(record.title) ?? cleanText(preview?.title) ?? url,
    description:
      cleanText(record.description) ?? cleanText(preview?.description) ?? null,
    ogImageUrl: previewImage,
    provider: cleanText(preview?.siteName),
  };
  const derivatives = {
    original: url
      ? {
          kind: 'original' as const,
          url,
        }
      : null,
    display: previewImage
      ? {
          kind: 'display' as const,
          url: previewImage,
        }
      : null,
    thumbnail: previewImage
      ? {
          kind: 'thumbnail' as const,
          url: previewImage,
        }
      : null,
  };
  const delivery = buildPlatformMediaDelivery({
    assetId,
    sourceType: 'link',
    mediaType: 'link',
    source: {
      externalUrl: url,
      provider: cleanText(preview?.siteName),
    },
    derivatives,
  });

  return {
    assetId,
    ownerId,
    sourceType: 'link',
    mediaType: 'link',
    processingState: 'ready',
    source: {
      externalUrl: url,
      provider: cleanText(preview?.siteName),
    },
    derivatives,
    rendering: buildPlatformMediaRenderingReferences({
      mediaType: 'link',
      source: {
        externalUrl: url,
        provider: cleanText(preview?.siteName),
      },
      derivatives,
      fallback: {
        thumbnailUrl: buildFallbackThumbnail({
          mediaType: 'doc',
          title: cleanText(preview?.title) ?? cleanText(record.title) ?? url,
        }),
      },
      delivery,
    }),
    delivery,
    fallback: {
      label: 'Link preview',
    },
    failure: null,
    lifecycle: buildPlatformMediaLifecycle({
      sourceType: 'link',
      processingState: 'ready',
      metadata,
    }),
    metadata,
    telemetry: {
      pipeline: 'legacy_migration',
      surface: record.surface ?? 'feed',
      stage: 'compatibility_adapter',
      lastEvent: 'legacy_asset_mapped',
      lastEventAt: new Date().toISOString(),
      meta: {
        legacyKind: record.kind,
      },
    },
    ...buildLegacyModerationState(),
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
}

function createPortfolioProjectAsset(
  record: LegacyPortfolioProjectRecord,
): PlatformMediaAsset {
  const project = record.project;
  const primaryUrl =
    cleanUrl(project.project_url) ?? cleanUrl(project.image_url);
  const manualImageUrl = cleanUrl(project.image_url);
  const thumbnailUrl = cleanUrl(project.thumbnail_url);
  const mediaType = inferLegacyMediaType({
    url: project.project_url,
    resolvedType: project.resolved_type,
  });
  const sourceStorage = parseStorageLocation(cleanUrl(project.project_url));
  const manualStorage = parseStorageLocation(manualImageUrl);
  const extensions = getMediaExtensions({
    mediaType,
    mimeType: null,
  });
  const structuredOriginalUrl =
    cleanUrl(project.project_url) &&
    /\/original\./.test(cleanUrl(project.project_url) ?? '')
      ? cleanUrl(project.project_url)
      : null;
  const displayUrl =
    manualImageUrl ??
    (structuredOriginalUrl
      ? deriveSiblingUrl(
          structuredOriginalUrl,
          'display',
          extensions.displayExtension,
        )
      : mediaType === 'image'
        ? cleanUrl(project.project_url)
        : thumbnailUrl);
  const resolvedThumbnailUrl =
    manualImageUrl ??
    thumbnailUrl ??
    (structuredOriginalUrl
      ? deriveSiblingUrl(
          structuredOriginalUrl,
          'thumbnail',
          extensions.thumbnailExtension,
        )
      : mediaType === 'image'
        ? cleanUrl(project.project_url)
        : null);
  const processingState = mapLegacyStatusToProcessingState({
    pending: project.thumbnail_status === 'pending',
    failed: project.thumbnail_status === 'failed',
  });
  const failure = buildFailureMetadata({
    mediaType,
    processingState,
    needsThumbnailBackfill: !resolvedThumbnailUrl && mediaType !== 'link',
  });
  const metadata: PlatformMediaMetadata = {
    title: project.title,
    description: project.description,
    surface: 'portfolio',
    parentType: 'portfolio_item',
    parentId: project.id,
    originalFilename: cleanText(project.title),
  };
  const sourceType =
    cleanUrl(project.project_url)?.startsWith('http://') ||
    cleanUrl(project.project_url)?.startsWith('https://')
      ? sourceStorage.bucket || manualStorage.bucket
        ? 'upload'
        : 'link'
      : 'upload';
  const derivatives = {
    original: cleanUrl(project.project_url)
      ? {
          kind: 'original' as const,
          url: cleanUrl(project.project_url),
          storageBucket: sourceStorage.bucket,
          storagePath: sourceStorage.path,
        }
      : null,
    display: displayUrl
      ? {
          kind: 'display' as const,
          url: displayUrl,
          storageBucket: manualStorage.bucket ?? sourceStorage.bucket,
          storagePath:
            manualStorage.path ??
            (sourceStorage.path && structuredOriginalUrl
              ? deriveSiblingPath(
                  sourceStorage.path,
                  'display',
                  extensions.displayExtension,
                )
              : sourceStorage.path),
        }
      : null,
    thumbnail: resolvedThumbnailUrl
      ? {
          kind: 'thumbnail' as const,
          url: resolvedThumbnailUrl,
          storageBucket: manualStorage.bucket ?? sourceStorage.bucket,
          storagePath:
            thumbnailUrl && parseStorageLocation(thumbnailUrl).path
              ? parseStorageLocation(thumbnailUrl).path
              : sourceStorage.path && structuredOriginalUrl
                ? deriveSiblingPath(
                    sourceStorage.path,
                    'thumbnail',
                    extensions.thumbnailExtension,
                  )
                : manualStorage.path,
        }
      : null,
  };
  const delivery = buildPlatformMediaDelivery({
    assetId: project.id,
    sourceType,
    mediaType,
    source: {
      externalUrl: primaryUrl,
      storageBucket: sourceStorage.bucket ?? manualStorage.bucket,
      storagePath: sourceStorage.path ?? manualStorage.path,
    },
    derivatives,
    updatedAt: project.created_at,
    createdAt: project.created_at,
  });

  return {
    assetId: project.id,
    ownerId: project.owner_id,
    sourceType,
    mediaType,
    processingState,
    source: {
      externalUrl: primaryUrl,
      storageBucket: sourceStorage.bucket ?? manualStorage.bucket,
      storagePath: sourceStorage.path ?? manualStorage.path,
    },
    derivatives,
    rendering: buildPlatformMediaRenderingReferences({
      mediaType,
      source: {
        externalUrl: primaryUrl,
        storageBucket: sourceStorage.bucket ?? manualStorage.bucket,
        storagePath: sourceStorage.path ?? manualStorage.path,
      },
      derivatives,
      fallback: {
        thumbnailUrl: buildFallbackThumbnail({
          mediaType,
          title: project.title,
        }),
      },
      delivery,
    }),
    delivery,
    fallback: {
      label: project.title,
      thumbnailUrl:
        resolvedThumbnailUrl ??
        buildFallbackThumbnail({
          mediaType,
          title: project.title,
        }),
    },
    failure,
    lifecycle: buildPlatformMediaLifecycle({
      sourceType,
      processingState,
      failure,
      metadata,
      updatedAt: project.created_at,
      createdAt: project.created_at,
    }),
    metadata,
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'portfolio',
      stage: 'compatibility_adapter',
      lastEvent: 'legacy_asset_mapped',
      lastEventAt: new Date().toISOString(),
      meta: {
        legacyKind: record.kind,
      },
    },
    ...buildLegacyModerationState(),
    retryCount: 0,
    createdAt: cleanIsoDate(project.created_at) ?? new Date().toISOString(),
    updatedAt: cleanIsoDate(project.created_at) ?? new Date().toISOString(),
    deletedAt: null,
  };
}

function deriveResumeThumbnailUrl(url: string | null): string | null {
  const resumeUrl = cleanUrl(url);
  if (!resumeUrl) return null;
  if (resumeUrl.includes('/resume-thumbnail.')) return resumeUrl;
  if (resumeUrl.includes('/resume-original.')) {
    return replaceTerminalFileName(resumeUrl, 'resume-thumbnail.jpg');
  }
  if (/\/resume\.[a-z0-9]+$/i.test(resumeUrl)) {
    return replaceTerminalFileName(resumeUrl, 'resume-thumbnail.jpg');
  }
  return null;
}

function createResumeAsset(record: LegacyResumeRecord): PlatformMediaAsset {
  const sourceUrl = cleanUrl(record.url);
  const sourceStorage = parseStorageLocation(sourceUrl);
  const ownerId = extractOwnerId({
    ownerId: record.ownerId,
    path: sourceStorage.path,
    url: sourceUrl,
    fallbackSeed: sourceUrl ?? 'resume',
  });
  const assetId = stableLegacyAssetId(
    `resume:${sourceUrl ?? 'missing'}:${ownerId}`,
  );
  const thumbnailUrl =
    cleanUrl(record.thumbnailUrl) ?? deriveResumeThumbnailUrl(sourceUrl);
  const pending = record.thumbnailStatus === 'pending';
  const failed = record.thumbnailStatus === 'failed';
  const processingState = mapLegacyStatusToProcessingState({
    pending,
    failed,
  });
  const failure = buildFailureMetadata({
    mediaType: 'doc',
    processingState,
    needsThumbnailBackfill: !thumbnailUrl,
  });
  const metadata: PlatformMediaMetadata = {
    title: cleanText(record.fileName) ?? 'Resume',
    originalFilename: cleanText(record.fileName),
    surface: 'profile',
    parentType: 'profile_resume',
  };
  const derivatives = {
    original: sourceUrl
      ? {
          kind: 'original' as const,
          url: sourceUrl,
          storageBucket: sourceStorage.bucket,
          storagePath: sourceStorage.path,
        }
      : null,
    display: thumbnailUrl
      ? {
          kind: 'display' as const,
          url: thumbnailUrl,
          storageBucket: parseStorageLocation(thumbnailUrl).bucket,
          storagePath: parseStorageLocation(thumbnailUrl).path,
        }
      : null,
    thumbnail: thumbnailUrl
      ? {
          kind: 'thumbnail' as const,
          url: thumbnailUrl,
          storageBucket: parseStorageLocation(thumbnailUrl).bucket,
          storagePath: parseStorageLocation(thumbnailUrl).path,
        }
      : null,
  };
  const delivery = buildPlatformMediaDelivery({
    assetId,
    sourceType: sourceStorage.bucket ? 'upload' : 'link',
    mediaType: 'doc',
    source: {
      externalUrl: sourceUrl,
      storageBucket: sourceStorage.bucket,
      storagePath: sourceStorage.path,
    },
    derivatives,
    updatedAt: record.updatedAt ?? record.createdAt ?? null,
    createdAt: record.createdAt ?? null,
  });

  return {
    assetId,
    ownerId,
    sourceType: sourceStorage.bucket ? 'upload' : 'link',
    mediaType: 'doc',
    processingState,
    source: {
      externalUrl: sourceUrl,
      storageBucket: sourceStorage.bucket,
      storagePath: sourceStorage.path,
    },
    derivatives,
    rendering: buildPlatformMediaRenderingReferences({
      mediaType: 'doc',
      source: {
        externalUrl: sourceUrl,
        storageBucket: sourceStorage.bucket,
        storagePath: sourceStorage.path,
      },
      derivatives,
      fallback: {
        thumbnailUrl:
          thumbnailUrl ??
          buildFallbackThumbnail({
            mediaType: 'doc',
            title: cleanText(record.fileName) ?? 'Resume',
          }),
      },
      delivery,
    }),
    delivery,
    fallback: {
      label: cleanText(record.fileName) ?? 'Resume',
      thumbnailUrl:
        thumbnailUrl ??
        buildFallbackThumbnail({
          mediaType: 'doc',
          title: cleanText(record.fileName) ?? 'Resume',
        }),
    },
    failure,
    lifecycle: buildPlatformMediaLifecycle({
      sourceType: sourceStorage.bucket ? 'upload' : 'link',
      processingState,
      failure,
      metadata,
      updatedAt: record.updatedAt ?? record.createdAt ?? null,
      createdAt: record.createdAt ?? null,
    }),
    metadata,
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'profile',
      stage: 'compatibility_adapter',
      lastEvent: 'legacy_asset_mapped',
      lastEventAt: new Date().toISOString(),
      meta: {
        legacyKind: record.kind,
      },
    },
    ...buildLegacyModerationState(),
    retryCount: 0,
    createdAt: cleanIsoDate(record.createdAt) ?? new Date().toISOString(),
    updatedAt:
      cleanIsoDate(record.updatedAt ?? record.createdAt) ??
      new Date().toISOString(),
    deletedAt: null,
  };
}

function createGroupImageAsset(
  record: LegacyGroupImageRecord,
): PlatformMediaAsset {
  const imageUrl = cleanUrl(record.room.image_url);
  const storage = parseStorageLocation(imageUrl);
  const ownerId = extractOwnerId({
    path: storage.path,
    url: imageUrl,
    fallbackSeed: record.room.id,
  });
  const assetId = record.room.id;
  const thumbnailUrl =
    storage.path && imageUrl
      ? deriveSiblingUrl(imageUrl, 'thumbnail', 'jpg')
      : imageUrl;
  const derivatives = {
    original: null,
    display: imageUrl
      ? {
          kind: 'display' as const,
          url: imageUrl,
          storageBucket: storage.bucket,
          storagePath: storage.path,
        }
      : null,
    thumbnail: thumbnailUrl
      ? {
          kind: 'thumbnail' as const,
          url: thumbnailUrl,
          storageBucket: storage.bucket,
          storagePath: storage.path
            ? deriveSiblingPath(storage.path, 'thumbnail', 'jpg')
            : null,
        }
      : null,
  };
  const metadata: PlatformMediaMetadata = {
    title: cleanText(record.room.name) ?? 'Group image',
    surface: 'groups',
    parentType: 'chat_room',
    parentId: record.room.id,
  };
  const delivery = buildPlatformMediaDelivery({
    assetId,
    sourceType: storage.bucket ? 'upload' : 'link',
    mediaType: 'image',
    source: {
      externalUrl: imageUrl,
      storageBucket: storage.bucket,
      storagePath: storage.path,
    },
    derivatives,
    updatedAt: record.room.updated_at,
    createdAt: record.room.updated_at,
  });

  return {
    assetId,
    ownerId,
    sourceType: storage.bucket ? 'upload' : 'link',
    mediaType: 'image',
    processingState: 'ready',
    source: {
      externalUrl: imageUrl,
      storageBucket: storage.bucket,
      storagePath: storage.path,
    },
    derivatives,
    rendering: buildPlatformMediaRenderingReferences({
      mediaType: 'image',
      source: {
        externalUrl: imageUrl,
        storageBucket: storage.bucket,
        storagePath: storage.path,
      },
      derivatives,
      delivery,
    }),
    delivery,
    fallback: {
      label: cleanText(record.room.name) ?? 'Group image',
    },
    failure: null,
    lifecycle: buildPlatformMediaLifecycle({
      sourceType: storage.bucket ? 'upload' : 'link',
      processingState: 'ready',
      metadata,
      updatedAt: record.room.updated_at,
      createdAt: record.room.updated_at,
    }),
    metadata,
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'groups',
      stage: 'compatibility_adapter',
      lastEvent: 'legacy_asset_mapped',
      lastEventAt: new Date().toISOString(),
      meta: {
        legacyKind: record.kind,
      },
    },
    ...buildLegacyModerationState(),
    retryCount: 0,
    createdAt: cleanIsoDate(record.room.updated_at) ?? new Date().toISOString(),
    updatedAt: cleanIsoDate(record.room.updated_at) ?? new Date().toISOString(),
    deletedAt: null,
  };
}

function createChatAttachmentAsset(
  record: LegacyChatAttachmentRecord,
): PlatformMediaAsset {
  const attachment = record.attachment;
  const mediaType = inferLegacyMediaType({
    mimeType: attachment.mime_type,
    url: attachment.storage_path,
  });
  const ownerId = extractOwnerId({
    path: attachment.storage_path,
    fallbackSeed: attachment.id,
  });
  const structuredOriginal = /\/original\./.test(attachment.storage_path);
  const extensions = getMediaExtensions({
    mediaType,
    mimeType: attachment.mime_type,
  });
  const displayPath = structuredOriginal
    ? deriveSiblingPath(
        attachment.storage_path,
        'display',
        extensions.displayExtension,
      )
    : attachment.storage_path;
  const thumbnailPath =
    structuredOriginal || mediaType !== 'image'
      ? deriveSiblingPath(
          attachment.storage_path,
          'thumbnail',
          extensions.thumbnailExtension,
        )
      : null;
  const resolvedOriginalUrl = cleanUrl(record.resolvedUrls?.originalUrl);
  const resolvedDisplayUrl =
    cleanUrl(record.resolvedUrls?.displayUrl) ?? resolvedOriginalUrl;
  const resolvedThumbnailUrl = cleanUrl(record.resolvedUrls?.thumbnailUrl);
  const needsThumbnailBackfill = mediaType !== 'image' && !resolvedThumbnailUrl;
  const processingState = mapLegacyStatusToProcessingState({
    failed: needsThumbnailBackfill,
  });
  const failure = buildFailureMetadata({
    mediaType,
    processingState,
    needsThumbnailBackfill,
  });
  const metadata: PlatformMediaMetadata = {
    surface: 'chat',
    parentType: 'chat_message_attachment',
    parentId: attachment.message_id,
    mimeType: attachment.mime_type,
    sizeOriginal: attachment.file_size,
  };
  const derivatives = {
    original: {
      kind: 'original' as const,
      url: resolvedOriginalUrl,
      storageBucket: 'chat-attachments',
      storagePath: attachment.storage_path,
      mimeType: attachment.mime_type,
      sizeBytes: attachment.file_size,
    },
    display: {
      kind: 'display' as const,
      url: resolvedDisplayUrl,
      storageBucket: 'chat-attachments',
      storagePath: displayPath,
      mimeType:
        mediaType === 'gif' && /\.mp4(?:$|\?)/i.test(resolvedDisplayUrl ?? '')
          ? 'video/mp4'
          : attachment.mime_type,
    },
    thumbnail:
      thumbnailPath || resolvedThumbnailUrl
        ? {
            kind: 'thumbnail' as const,
            url: resolvedThumbnailUrl,
            storageBucket: 'chat-attachments',
            storagePath: thumbnailPath,
            mimeType:
              extensions.thumbnailExtension === 'jpg'
                ? 'image/jpeg'
                : 'image/svg+xml',
          }
        : null,
  };
  const delivery = buildPlatformMediaDelivery({
    assetId: attachment.id,
    sourceType: 'upload',
    mediaType,
    source: {
      storageBucket: 'chat-attachments',
      storagePath: attachment.storage_path,
      mimeType: attachment.mime_type,
    },
    derivatives,
    updatedAt: attachment.created_at,
    createdAt: attachment.created_at,
  });

  return {
    assetId: attachment.id,
    ownerId,
    sourceType: 'upload',
    mediaType,
    processingState,
    source: {
      storageBucket: 'chat-attachments',
      storagePath: attachment.storage_path,
      mimeType: attachment.mime_type,
    },
    derivatives,
    rendering: buildPlatformMediaRenderingReferences({
      mediaType,
      source: {
        storageBucket: 'chat-attachments',
        storagePath: attachment.storage_path,
      },
      derivatives,
      fallback: {
        thumbnailUrl:
          resolvedThumbnailUrl ??
          (mediaType === 'doc'
            ? buildFallbackThumbnail({
                mediaType: 'doc',
                title: 'Document attachment',
                mimeType: attachment.mime_type,
              })
            : null),
      },
      delivery,
    }),
    delivery,
    fallback: {
      label: mediaType === 'doc' ? 'Document attachment' : 'Attachment preview',
      thumbnailUrl:
        resolvedThumbnailUrl ??
        (mediaType === 'doc'
          ? buildFallbackThumbnail({
              mediaType: 'doc',
              title: 'Document attachment',
              mimeType: attachment.mime_type,
            })
          : null),
    },
    failure,
    lifecycle: buildPlatformMediaLifecycle({
      sourceType: 'upload',
      processingState,
      failure,
      metadata,
      updatedAt: attachment.created_at,
      createdAt: attachment.created_at,
    }),
    metadata,
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'chat',
      stage: 'compatibility_adapter',
      lastEvent: 'legacy_asset_mapped',
      lastEventAt: new Date().toISOString(),
      meta: {
        legacyKind: record.kind,
      },
    },
    ...buildLegacyModerationState(),
    retryCount: 0,
    createdAt: cleanIsoDate(attachment.created_at) ?? new Date().toISOString(),
    updatedAt: cleanIsoDate(attachment.created_at) ?? new Date().toISOString(),
    deletedAt: null,
  };
}

export function createLegacyPlatformMediaAsset(
  record: LegacyMediaRecord,
): PlatformMediaAsset {
  switch (record.kind) {
    case 'feed_attachment':
      return createFeedAttachmentAsset(record);
    case 'gif':
      return createGifAsset(record);
    case 'link_preview':
      return createLinkPreviewAsset(record);
    case 'portfolio_project':
      return createPortfolioProjectAsset(record);
    case 'profile_resume':
      return createResumeAsset(record);
    case 'group_image':
      return createGroupImageAsset(record);
    case 'chat_attachment':
      return createChatAttachmentAsset(record);
  }
}

function deprecatedHandlersForSurface(surface: LegacyMediaSurface): string[] {
  return (
    LEGACY_MEDIA_ROLLOUT_CHECKLIST.find((entry) => entry.surface === surface)
      ?.deprecatedHandlers ?? []
  );
}

export function buildLegacyMediaBackfillPlan(
  record: LegacyMediaRecord,
): LegacyMediaBackfillPlan {
  const asset = createLegacyPlatformMediaAsset(record);
  const resumeRecord = record.kind === 'profile_resume' ? record : null;
  const needsThumbnailBackfill =
    (resumeRecord
      ? !cleanUrl(resumeRecord.thumbnailUrl) ||
        resumeRecord.thumbnailStatus === 'pending' ||
        resumeRecord.thumbnailStatus === 'failed'
      : !hasDerivative(asset.derivatives.thumbnail)) &&
    ['doc', 'gif', 'video'].includes(asset.mediaType);
  const needsDisplayBackfill =
    !hasDerivative(asset.derivatives.display) &&
    ['doc', 'video'].includes(asset.mediaType);
  const needsLinkPreviewBackfill =
    record.kind === 'link_preview' &&
    !cleanText(asset.metadata.provider) &&
    !cleanText(asset.metadata.description);
  const needsMetadataBackfill =
    !cleanText(asset.metadata.title) ||
    (asset.mediaType === 'doc' && !cleanText(asset.metadata.originalFilename));
  const needsGifReprocessing =
    asset.mediaType === 'gif' && needsThumbnailBackfill;
  return {
    needsAssetBackfill: true,
    needsDisplayBackfill,
    needsThumbnailBackfill,
    needsMetadataBackfill,
    needsLinkPreviewBackfill,
    needsGifReprocessing,
    reprocessReason: needsGifReprocessing
      ? GIF_FAILURE_REASON
      : needsThumbnailBackfill && asset.mediaType === 'doc'
        ? DOC_FAILURE_REASON
        : needsDisplayBackfill
          ? 'Legacy asset is missing display derivatives.'
          : null,
    compatibilityMode:
      needsDisplayBackfill ||
      needsThumbnailBackfill ||
      needsMetadataBackfill ||
      needsLinkPreviewBackfill
        ? 'legacy_adapter'
        : 'ready_for_cutover',
    deprecatedHandlers: deprecatedHandlersForSurface(
      (asset.metadata.surface as LegacyMediaSurface | null) ?? 'feed',
    ),
  };
}

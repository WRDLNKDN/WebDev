import type { LinkPreviewData } from '../linkPreview';
import type { ChatMessageAttachment, ChatRoom } from '../../types/chat';
import type { PortfolioItem } from '../../types/portfolio';
import type {
  PlatformMediaAsset,
  PlatformMediaProcessingState,
  PlatformMediaSourceType,
} from './contract';
import { buildDocumentPreviewDataUrl, detectDocumentKind } from './documents';
import { createLegacyPlatformMediaAsset } from './legacyCompatibility';

export type NormalizedAssetSourceType = 'upload' | 'link';
export type NormalizedAssetMediaType = 'image' | 'video' | 'doc' | 'link';
export type NormalizedAssetProcessingState =
  | 'uploading'
  | 'optimizing'
  | 'converting'
  | 'ready'
  | 'failed';

type NormalizedAssetMetadataFields = {
  moderationStatus?: string | null;
  safeToRender?: boolean;
  failureMessage?: string | null;
  /** When false, failed assets hide the Retry affordance in shared media UI. */
  retryable?: boolean | null;
  abuseReportId?: string | null;
  mimeType?: string | null;
  title?: string | null;
  description?: string | null;
  ogImageUrl?: string | null;
  originalFilename?: string | null;
  provider?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type NormalizedAsset = {
  assetId: string;
  sourceType: NormalizedAssetSourceType;
  mediaType: NormalizedAssetMediaType;
  originalUrl: string | null;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  sizeOriginal: number | null;
  sizeDisplay: number | null;
  sizeThumbnail: number | null;
  processingState: NormalizedAssetProcessingState;
  fallbackBehavior: string;
} & NormalizedAssetMetadataFields;

export const MEDIA_ORIGINAL_FILE_STEM = 'original';
export const MEDIA_DISPLAY_FILE_STEM = 'display';
export const MEDIA_THUMBNAIL_FILE_STEM = 'thumbnail';

type FallbackInput = {
  mediaType: NormalizedAssetMediaType;
  title?: string | null;
  mimeType?: string | null;
};

export function getStructuredMediaDerivativeExtensions(params: {
  mediaType: NormalizedAssetMediaType;
  mimeType?: string | null;
}): {
  displayExtension: 'gif' | 'png' | 'webp' | 'svg' | 'mp4';
  thumbnailExtension: 'jpg' | 'svg';
} {
  const mimeType = params.mimeType?.toLowerCase().trim() ?? '';

  if (params.mediaType === 'image') {
    if (mimeType === 'image/gif') {
      return {
        displayExtension: 'gif',
        thumbnailExtension: 'jpg',
      };
    }

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

function stableAssetId(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.trunc(hash * 31 + seed.charCodeAt(index));
  }
  return `asset-${Math.abs(hash).toString(36)}`;
}

function fallbackPalette(mediaType: NormalizedAssetMediaType) {
  switch (mediaType) {
    case 'video':
      return {
        bg: '#0f172a',
        accent: '#22d3ee',
        label: 'VIDEO',
      };
    case 'doc':
      return {
        bg: '#1f2937',
        accent: '#f59e0b',
        label: 'DOCUMENT',
      };
    case 'link':
      return {
        bg: '#082f49',
        accent: '#38bdf8',
        label: 'LINK',
      };
    default:
      return {
        bg: '#0f172a',
        accent: '#34d399',
        label: 'IMAGE',
      };
  }
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildDeterministicAssetThumbnail(input: FallbackInput): string {
  const palette = fallbackPalette(input.mediaType);
  const title =
    input.title?.trim() ||
    (input.mimeType?.split('/').pop()?.toUpperCase() ?? palette.label);
  if (input.mediaType === 'doc') {
    return buildDocumentPreviewDataUrl({
      title,
      fileName: title,
      mimeType: input.mimeType,
    });
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${escapeSvgText(title)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${palette.bg}"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs><rect width="1200" height="675" rx="36" fill="url(#g)"/><rect x="54" y="54" width="1092" height="567" rx="28" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="6"/><rect x="84" y="88" width="230" height="54" rx="27" fill="${palette.accent}" fill-opacity="0.16"/><text x="114" y="124" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${palette.accent}">${palette.label}</text><text x="84" y="238" font-family="Arial, sans-serif" font-size="60" font-weight="700" fill="#f8fafc">${escapeSvgText(title.slice(0, 36) || palette.label)}</text><text x="84" y="304" font-family="Arial, sans-serif" font-size="28" fill="#cbd5e1">Preview unavailable. WRDLNKDN is showing a deterministic fallback.</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getNormalizedAssetThumbnailUrl(asset: NormalizedAsset): string {
  return (
    asset.thumbnailUrl ??
    buildDeterministicAssetThumbnail({
      mediaType: asset.mediaType,
      title: asset.title,
      mimeType: asset.mimeType,
    })
  );
}

export function getNormalizedAssetDisplayUrl(asset: NormalizedAsset): string {
  return asset.displayUrl ?? getNormalizedAssetThumbnailUrl(asset);
}

export function getNormalizedAssetOriginalUrl(asset: NormalizedAsset): string {
  return asset.originalUrl ?? getNormalizedAssetDisplayUrl(asset);
}

export function inferMediaType(params: {
  mimeType?: string | null;
  url?: string | null;
  resolvedType?: string | null;
}): NormalizedAssetMediaType {
  const mime = params.mimeType?.toLowerCase().trim() ?? '';
  const resolvedType = params.resolvedType?.toLowerCase().trim() ?? '';
  const url = params.url?.toLowerCase().trim() ?? '';

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (detectDocumentKind(params)) return 'doc';

  if (['image'].includes(resolvedType)) return 'image';
  if (['video'].includes(resolvedType)) return 'video';
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

  if (
    /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:$|\?)/i.test(url) ||
    url.includes('/storage/v1/object/public/feed-post-images/') ||
    url.includes('/storage/v1/object/public/project-images/') ||
    url.includes('/storage/v1/object/public/portfolio-thumbnails/')
  ) {
    return 'image';
  }
  if (/\.(mp4|webm|mov)(?:$|\?)/i.test(url)) return 'video';
  if (
    /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|md)(?:$|\?)/i.test(url) ||
    url.includes('/storage/v1/object/public/resumes/')
  ) {
    return 'doc';
  }
  return 'link';
}

function getFallbackBehavior(mediaType: NormalizedAssetMediaType): string {
  switch (mediaType) {
    case 'video':
      return 'show-video-fallback-thumbnail';
    case 'doc':
      return 'show-document-fallback-thumbnail';
    case 'link':
      return 'show-link-fallback-thumbnail';
    default:
      return 'show-image-fallback-thumbnail';
  }
}

type CreateNormalizedAssetInput = {
  assetId?: string;
  sourceType: NormalizedAssetSourceType;
  mediaType: NormalizedAssetMediaType;
  originalUrl?: string | null;
  displayUrl?: string | null;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  sizeOriginal?: number | null;
  sizeDisplay?: number | null;
  sizeThumbnail?: number | null;
  processingState?: NormalizedAssetProcessingState;
} & NormalizedAssetMetadataFields;

export function createNormalizedAsset(
  input: CreateNormalizedAssetInput,
): NormalizedAsset {
  const seed =
    input.assetId ??
    [
      input.sourceType,
      input.mediaType,
      input.originalUrl ?? '',
      input.displayUrl ?? '',
      input.thumbnailUrl ?? '',
      input.title ?? '',
    ].join(':');
  return {
    assetId: input.assetId ?? stableAssetId(seed),
    sourceType: input.sourceType,
    mediaType: input.mediaType,
    originalUrl: input.originalUrl ?? null,
    displayUrl: input.displayUrl ?? null,
    thumbnailUrl: input.thumbnailUrl ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    duration: input.duration ?? null,
    sizeOriginal: input.sizeOriginal ?? null,
    sizeDisplay: input.sizeDisplay ?? null,
    sizeThumbnail: input.sizeThumbnail ?? null,
    processingState: input.processingState ?? 'ready',
    fallbackBehavior: getFallbackBehavior(input.mediaType),
    moderationStatus: input.moderationStatus ?? null,
    safeToRender: input.safeToRender ?? true,
    failureMessage: input.failureMessage ?? null,
    retryable: input.retryable ?? null,
    abuseReportId: input.abuseReportId ?? null,
    mimeType: input.mimeType ?? null,
    title: input.title ?? null,
    description: input.description ?? null,
    ogImageUrl: input.ogImageUrl ?? null,
    originalFilename: input.originalFilename ?? null,
    provider: input.provider ?? null,
    createdAt: input.createdAt ?? null,
    updatedAt: input.updatedAt ?? null,
  };
}

function toNormalizedSourceType(
  sourceType: PlatformMediaSourceType,
): NormalizedAssetSourceType {
  return sourceType === 'upload' ? 'upload' : 'link';
}

function toNormalizedMediaType(
  asset: Pick<
    PlatformMediaAsset,
    'mediaType' | 'rendering' | 'derivatives' | 'source' | 'metadata'
  >,
): NormalizedAssetMediaType {
  if (asset.mediaType === 'video') return 'video';
  if (asset.mediaType === 'doc') return 'doc';
  if (asset.mediaType === 'link') return 'link';
  if (asset.mediaType === 'gif') {
    const displayMime =
      asset.derivatives.display?.mimeType ??
      asset.source.mimeType ??
      asset.metadata.mimeType ??
      null;
    const displayUrl = asset.rendering.displayUrl ?? '';
    return displayMime === 'video/mp4' || /\.mp4(?:$|\?)/i.test(displayUrl)
      ? 'video'
      : 'image';
  }
  return 'image';
}

function toNormalizedProcessingState(
  asset: Pick<
    PlatformMediaAsset,
    'processingState' | 'mediaType' | 'moderationStatus' | 'moderation'
  >,
): NormalizedAssetProcessingState {
  if (
    asset.moderationStatus === 'quarantined' ||
    asset.moderation?.safeToRender === false
  ) {
    return 'failed';
  }
  const state = asset.processingState as PlatformMediaProcessingState;
  if (state === 'failed' || state === 'deleted') return 'failed';
  if (state === 'pending' || state === 'uploading') return 'uploading';
  if (state === 'processing') {
    return asset.mediaType === 'doc' ? 'converting' : 'optimizing';
  }
  return 'ready';
}

export function createNormalizedAssetFromPlatformMediaAsset(
  asset: Pick<
    PlatformMediaAsset,
    | 'assetId'
    | 'sourceType'
    | 'mediaType'
    | 'processingState'
    | 'rendering'
    | 'derivatives'
    | 'source'
    | 'metadata'
    | 'failure'
    | 'moderationStatus'
    | 'moderation'
    | 'createdAt'
    | 'updatedAt'
  >,
): NormalizedAsset {
  const quarantined =
    asset.moderationStatus === 'quarantined' ||
    asset.moderation?.safeToRender === false;
  const normalizedMediaType = toNormalizedMediaType(asset);
  const original =
    asset.derivatives.original ??
    (asset.rendering.originalUrl
      ? {
          sizeBytes: asset.metadata.sizeOriginal ?? null,
          mimeType: asset.source.mimeType ?? asset.metadata.mimeType ?? null,
        }
      : null);
  const display =
    asset.derivatives.display ??
    (asset.rendering.displayUrl
      ? {
          sizeBytes: asset.metadata.sizeDisplay ?? null,
          mimeType: asset.source.mimeType ?? asset.metadata.mimeType ?? null,
        }
      : null);
  const thumbnail =
    asset.derivatives.thumbnail ??
    (asset.rendering.thumbnailUrl
      ? {
          sizeBytes: asset.metadata.sizeThumbnail ?? null,
        }
      : null);

  return createNormalizedAsset({
    assetId: asset.assetId,
    sourceType: toNormalizedSourceType(asset.sourceType),
    mediaType: normalizedMediaType,
    originalUrl: asset.rendering.originalUrl,
    displayUrl: asset.rendering.displayUrl,
    thumbnailUrl: asset.rendering.thumbnailUrl,
    width:
      asset.derivatives.display?.width ??
      asset.derivatives.original?.width ??
      asset.metadata.width ??
      null,
    height:
      asset.derivatives.display?.height ??
      asset.derivatives.original?.height ??
      asset.metadata.height ??
      null,
    duration:
      asset.derivatives.display?.durationMs ??
      asset.derivatives.original?.durationMs ??
      asset.metadata.durationMs ??
      null,
    sizeOriginal: original?.sizeBytes ?? asset.metadata.sizeOriginal ?? null,
    sizeDisplay: display?.sizeBytes ?? asset.metadata.sizeDisplay ?? null,
    sizeThumbnail: thumbnail?.sizeBytes ?? asset.metadata.sizeThumbnail ?? null,
    processingState: toNormalizedProcessingState(asset),
    moderationStatus: asset.moderationStatus,
    safeToRender:
      asset.moderation?.safeToRender ??
      asset.moderationStatus !== 'quarantined',
    failureMessage:
      asset.moderationStatus === 'quarantined' ||
      asset.moderation?.safeToRender === false
        ? 'This media is unavailable.'
        : (asset.failure?.reason ?? null),
    retryable: asset.failure?.retryable ?? null,
    abuseReportId: asset.moderation?.abuseReport?.reportId ?? null,
    mimeType:
      display?.mimeType ??
      original?.mimeType ??
      asset.source.mimeType ??
      asset.metadata.mimeType ??
      null,
    title: quarantined ? 'Media unavailable' : (asset.metadata.title ?? null),
    description: quarantined ? null : (asset.metadata.description ?? null),
    ogImageUrl: asset.metadata.ogImageUrl ?? null,
    originalFilename: asset.metadata.originalFilename ?? null,
    provider: asset.metadata.provider ?? asset.source.provider ?? null,
    createdAt: asset.createdAt ?? null,
    updatedAt: asset.updatedAt ?? null,
  });
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

  if (lastSlashIndex < 0) {
    return `${fileName}${suffix}`;
  }

  return `${base.slice(0, lastSlashIndex + 1)}${fileName}${suffix}`;
}

export function deriveSiblingStoragePath(
  storagePath: string,
  nextStem: string,
  nextExtension: string,
): string {
  const extension = nextExtension.replace(/^\./, '');
  const fileName = `${nextStem}.${extension}`;
  return replaceTerminalFileName(storagePath, fileName);
}

export function deriveSiblingPublicUrl(
  publicUrl: string,
  nextStem: string,
  nextExtension: string,
): string {
  const extension = nextExtension.replace(/^\./, '');
  const fileName = `${nextStem}.${extension}`;
  return replaceTerminalFileName(publicUrl, fileName);
}

export function buildStructuredMediaStoragePath(params: {
  ownerId: string;
  scope: string;
  assetId?: string;
  extension: string;
  stem?: string;
}): { assetId: string; path: string } {
  const assetId = params.assetId ?? crypto.randomUUID();
  const extension = params.extension.replace(/^\./, '') || 'bin';
  const stem = params.stem ?? MEDIA_ORIGINAL_FILE_STEM;
  return {
    assetId,
    path: `${params.ownerId}/${params.scope}/${assetId}/${stem}.${extension}`,
  };
}

export function createNormalizedLinkAsset(params: {
  url: string;
  preview?: LinkPreviewData | null;
  title?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
}): NormalizedAsset {
  return createNormalizedAssetFromPlatformMediaAsset(
    createLegacyPlatformMediaAsset({
      kind: 'link_preview',
      url: params.url,
      preview: params.preview ?? null,
      title: params.title,
      description: params.description,
    }),
  );
}

export function createNormalizedGifAsset(params: {
  url: string;
  surface?: 'feed' | 'chat';
}): NormalizedAsset {
  return createNormalizedAssetFromPlatformMediaAsset(
    createLegacyPlatformMediaAsset({
      kind: 'gif',
      gifUrl: params.url,
      surface: params.surface ?? 'feed',
    }),
  );
}

export function createNormalizedFeedImageAsset(
  publicUrl: string,
): NormalizedAsset {
  return createNormalizedAssetFromPlatformMediaAsset(
    createLegacyPlatformMediaAsset({
      kind: 'feed_attachment',
      imageUrl: publicUrl,
    }),
  );
}

export function createNormalizedPortfolioAsset(
  project: PortfolioItem,
): NormalizedAsset {
  return createNormalizedAssetFromPlatformMediaAsset(
    createLegacyPlatformMediaAsset({
      kind: 'portfolio_project',
      project,
    }),
  );
}

export function createNormalizedResumeAsset(params: {
  url?: string | null;
  fileName?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
}): NormalizedAsset | null {
  const url = params.url?.trim() ?? '';
  if (!url) return null;
  return createNormalizedAssetFromPlatformMediaAsset(
    createLegacyPlatformMediaAsset({
      kind: 'profile_resume',
      url,
      fileName: params.fileName,
      thumbnailUrl: params.thumbnailUrl,
      thumbnailStatus: params.thumbnailStatus,
    }),
  );
}

export function createNormalizedGroupImageAsset(
  room: Pick<ChatRoom, 'id' | 'name' | 'image_url' | 'updated_at'>,
): NormalizedAsset | null {
  const displayUrl = room.image_url?.trim() ?? '';
  if (!displayUrl) return null;
  return createNormalizedAssetFromPlatformMediaAsset(
    createLegacyPlatformMediaAsset({
      kind: 'group_image',
      room,
    }),
  );
}

export type ResolvedChatAttachmentAsset = NormalizedAsset & {
  storagePath: string;
  thumbnailPath: string | null;
  displayPath: string | null;
};

export function createChatAttachmentStorageDescriptor(
  attachment: ChatMessageAttachment,
  urls: {
    originalUrl: string | null;
    displayUrl: string | null;
    thumbnailUrl: string | null;
  },
): ResolvedChatAttachmentAsset {
  const mediaType = inferMediaType({
    mimeType: attachment.mime_type,
    url: attachment.storage_path,
  });
  const hasStructuredOriginalPath = /\/original\./.test(
    attachment.storage_path,
  );
  const { displayExtension, thumbnailExtension } =
    getStructuredMediaDerivativeExtensions({
      mediaType,
      mimeType: attachment.mime_type,
    });
  const displayPath = hasStructuredOriginalPath
    ? deriveSiblingStoragePath(
        attachment.storage_path,
        MEDIA_DISPLAY_FILE_STEM,
        displayExtension,
      )
    : attachment.storage_path;
  const thumbnailPath = hasStructuredOriginalPath
    ? deriveSiblingStoragePath(
        attachment.storage_path,
        MEDIA_THUMBNAIL_FILE_STEM,
        thumbnailExtension,
      )
    : null;

  return {
    ...createNormalizedAssetFromPlatformMediaAsset(
      createLegacyPlatformMediaAsset({
        kind: 'chat_attachment',
        attachment,
        resolvedUrls: urls,
      }),
    ),
    storagePath: attachment.storage_path,
    displayPath,
    thumbnailPath,
  };
}

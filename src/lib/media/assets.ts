import type { LinkPreviewData } from '../linkPreview';
import type { ChatMessageAttachment, ChatRoom } from '../../types/chat';
import type { PortfolioItem } from '../../types/portfolio';

export type NormalizedAssetSourceType = 'upload' | 'link';
export type NormalizedAssetMediaType = 'image' | 'video' | 'doc' | 'link';
export type NormalizedAssetProcessingState =
  | 'uploading'
  | 'optimizing'
  | 'converting'
  | 'ready'
  | 'failed';

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
  mimeType?: string | null;
  title?: string | null;
  description?: string | null;
  ogImageUrl?: string | null;
  originalFilename?: string | null;
  provider?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const MEDIA_ORIGINAL_FILE_STEM = 'original';
export const MEDIA_DISPLAY_FILE_STEM = 'display';
export const MEDIA_THUMBNAIL_FILE_STEM = 'thumbnail';

type FallbackInput = {
  mediaType: NormalizedAssetMediaType;
  title?: string | null;
  mimeType?: string | null;
};

function stableAssetId(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
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
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('presentation') ||
    mime.includes('sheet') ||
    mime === 'text/plain' ||
    mime === 'text/markdown'
  ) {
    return 'doc';
  }

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

export function createNormalizedAsset(input: {
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
  mimeType?: string | null;
  title?: string | null;
  description?: string | null;
  ogImageUrl?: string | null;
  originalFilename?: string | null;
  provider?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}): NormalizedAsset {
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

function replaceTerminalFileName(pathOrUrl: string, fileName: string): string {
  const clean = pathOrUrl.trim();
  if (!clean) return clean;
  return clean.replace(/[^/]+(?=($|[?#]))/, fileName);
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
  const preview = params.preview ?? null;
  const displayUrl = params.thumbnailUrl ?? preview?.image ?? null;
  return createNormalizedAsset({
    sourceType: 'link',
    mediaType: 'link',
    originalUrl: params.url,
    displayUrl,
    thumbnailUrl: displayUrl,
    title: params.title ?? preview?.title ?? params.url,
    description: params.description ?? preview?.description ?? null,
    ogImageUrl: preview?.image ?? null,
    provider: preview?.siteName ?? null,
  });
}

export function createNormalizedFeedImageAsset(
  publicUrl: string,
): NormalizedAsset {
  const thumbnailUrl = /\/display\./.test(publicUrl)
    ? deriveSiblingPublicUrl(publicUrl, MEDIA_THUMBNAIL_FILE_STEM, 'jpg')
    : publicUrl;
  return createNormalizedAsset({
    sourceType: 'upload',
    mediaType: inferMediaType({ url: publicUrl }),
    originalUrl: null,
    displayUrl: publicUrl,
    thumbnailUrl,
  });
}

export function createNormalizedPortfolioAsset(
  project: PortfolioItem,
): NormalizedAsset {
  const mediaType = inferMediaType({
    url: project.project_url,
    resolvedType: project.resolved_type,
  });
  const originalUrl = project.project_url?.trim() || null;
  const displayUrl =
    project.image_url?.trim() ||
    (originalUrl && /\/original\./.test(originalUrl)
      ? deriveSiblingPublicUrl(originalUrl, MEDIA_DISPLAY_FILE_STEM, 'webp')
      : mediaType === 'image'
        ? originalUrl
        : project.thumbnail_url?.trim() || null);
  const thumbnailUrl =
    project.image_url?.trim() ||
    project.thumbnail_url?.trim() ||
    (originalUrl && /\/original\./.test(originalUrl)
      ? deriveSiblingPublicUrl(originalUrl, MEDIA_THUMBNAIL_FILE_STEM, 'jpg')
      : mediaType === 'image'
        ? originalUrl
        : null);
  const processingState: NormalizedAssetProcessingState =
    project.thumbnail_status === 'pending'
      ? 'optimizing'
      : project.thumbnail_status === 'failed'
        ? 'failed'
        : 'ready';

  return createNormalizedAsset({
    assetId: project.id,
    sourceType:
      originalUrl?.includes('/storage/v1/object/public/') ||
      originalUrl?.includes('/storage/v1/object/sign/')
        ? 'upload'
        : 'link',
    mediaType,
    originalUrl,
    displayUrl,
    thumbnailUrl,
    title: project.title,
    description: project.description,
    processingState,
    createdAt: project.created_at,
    updatedAt: project.created_at,
  });
}

export function createNormalizedResumeAsset(params: {
  url?: string | null;
  fileName?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
}): NormalizedAsset | null {
  const url = params.url?.trim() ?? '';
  if (!url) return null;
  return createNormalizedAsset({
    sourceType: 'upload',
    mediaType: 'doc',
    originalUrl: url,
    displayUrl: params.thumbnailUrl ?? null,
    thumbnailUrl: params.thumbnailUrl ?? null,
    title: params.fileName ?? 'Resume',
    originalFilename: params.fileName ?? null,
    processingState:
      params.thumbnailStatus === 'pending'
        ? 'converting'
        : params.thumbnailStatus === 'failed'
          ? 'failed'
          : 'ready',
  });
}

export function createNormalizedGroupImageAsset(
  room: Pick<ChatRoom, 'id' | 'name' | 'image_url' | 'updated_at'>,
): NormalizedAsset | null {
  const displayUrl = room.image_url?.trim() ?? '';
  if (!displayUrl) return null;
  return createNormalizedAsset({
    assetId: room.id,
    sourceType: 'upload',
    mediaType: 'image',
    originalUrl: null,
    displayUrl,
    thumbnailUrl: /\/display\./.test(displayUrl)
      ? deriveSiblingPublicUrl(displayUrl, MEDIA_THUMBNAIL_FILE_STEM, 'jpg')
      : displayUrl,
    title: room.name ?? 'Group image',
    updatedAt: room.updated_at,
  });
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
  const displayPath = /\/original\./.test(attachment.storage_path)
    ? deriveSiblingStoragePath(
        attachment.storage_path,
        MEDIA_DISPLAY_FILE_STEM,
        mediaType === 'video' ? 'mp4' : 'webp',
      )
    : attachment.storage_path;
  const thumbnailPath = /\/original\./.test(attachment.storage_path)
    ? deriveSiblingStoragePath(
        attachment.storage_path,
        MEDIA_THUMBNAIL_FILE_STEM,
        'jpg',
      )
    : null;

  return {
    ...createNormalizedAsset({
      assetId: attachment.id,
      sourceType: 'upload',
      mediaType,
      originalUrl: urls.originalUrl,
      displayUrl: urls.displayUrl,
      thumbnailUrl: urls.thumbnailUrl,
      sizeOriginal: attachment.file_size,
      mimeType: attachment.mime_type,
      createdAt: attachment.created_at,
    }),
    storagePath: attachment.storage_path,
    displayPath,
    thumbnailPath,
  };
}

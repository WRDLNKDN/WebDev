import { supabase } from '../auth/supabaseClient';
import { processChatGifUpload } from '../api/chatAttachmentsApi';
import {
  buildDeterministicAssetThumbnail,
  buildStructuredMediaStoragePath,
  deriveSiblingStoragePath,
  inferMediaType,
  MEDIA_DISPLAY_FILE_STEM,
  MEDIA_ORIGINAL_FILE_STEM,
  MEDIA_THUMBNAIL_FILE_STEM,
} from './assets';

const IMAGE_INPUT_MAX_BYTES = 15 * 1024 * 1024;
const DEFAULT_DISPLAY_LONG_EDGE = 1600;
const DEFAULT_THUMBNAIL_LONG_EDGE = 480;

type CanvasRenderResult = {
  blob: Blob;
  width: number;
  height: number;
};

export type StructuredPublicAssetUpload = {
  assetId: string;
  mediaType: 'image' | 'video' | 'doc';
  originalUrl: string | null;
  displayUrl: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  sizeOriginal: number | null;
  sizeDisplay: number | null;
  sizeThumbnail: number | null;
  mimeType: string;
  originalFilename: string;
};

export type StructuredChatAttachmentUpload = {
  assetId: string;
  storagePath: string;
  displayPath: string;
  thumbnailPath: string | null;
  mimeType: string;
  mediaType: 'image' | 'video' | 'doc';
  size: number;
  originalFilename: string;
};

function getFileExtension(fileName: string, fallback = 'bin'): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)(?:$|\?)/i);
  return match?.[1] ?? fallback;
}

function isSupportedImageMime(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
    mimeType,
  );
}

function isSupportedDocumentMime(mimeType: string): boolean {
  return [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
  ].includes(mimeType);
}

function isSupportedVideoMime(mimeType: string): boolean {
  return ['video/mp4', 'video/webm', 'video/quicktime'].includes(mimeType);
}

function normalizeMimeFromFile(file: File): string {
  const mimeType = file.type.toLowerCase().trim();
  if (mimeType) return mimeType;
  const extension = getFileExtension(file.name);
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    default:
      return '';
  }
}

function assertSupportedUpload(file: File): {
  mimeType: string;
  mediaType: 'image' | 'video' | 'doc';
} {
  const mimeType = normalizeMimeFromFile(file);
  if (!mimeType) {
    throw new Error('Unsupported file type.');
  }
  if (isSupportedImageMime(mimeType)) {
    return { mimeType, mediaType: 'image' };
  }
  if (isSupportedDocumentMime(mimeType)) {
    return { mimeType, mediaType: 'doc' };
  }
  if (isSupportedVideoMime(mimeType)) {
    return { mimeType, mediaType: 'video' };
  }
  throw new Error('Unsupported file type.');
}

function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not process image.'));
    };
    image.src = objectUrl;
  });
}

async function renderImageBlob(params: {
  file: Blob;
  longEdge: number;
  mimeType: 'image/webp' | 'image/jpeg' | 'image/png';
  quality?: number;
}): Promise<CanvasRenderResult> {
  const image = await loadImageElement(params.file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error('Could not read image size.');

  const scale = Math.min(1, params.longEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not process image.');
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) =>
        nextBlob
          ? resolve(nextBlob)
          : reject(new Error('Could not encode image.')),
      params.mimeType,
      params.quality,
    );
  });

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
  };
}

async function createImageDerivatives(file: File): Promise<{
  display: CanvasRenderResult;
  thumbnail: CanvasRenderResult;
}> {
  const displayMime: 'image/webp' | 'image/jpeg' | 'image/png' =
    file.type === 'image/png' ? 'image/png' : 'image/webp';
  const display = await renderImageBlob({
    file,
    longEdge: DEFAULT_DISPLAY_LONG_EDGE,
    mimeType: displayMime,
    quality: displayMime === 'image/png' ? undefined : 0.86,
  });
  const thumbnail = await renderImageBlob({
    file,
    longEdge: DEFAULT_THUMBNAIL_LONG_EDGE,
    mimeType: 'image/jpeg',
    quality: 0.82,
  });
  return { display, thumbnail };
}

function buildDocumentFallbackBlob(file: File): Blob {
  const dataUrl = buildDeterministicAssetThumbnail({
    mediaType: inferMediaType({ mimeType: normalizeMimeFromFile(file) }),
    title: file.name,
    mimeType: normalizeMimeFromFile(file),
  });
  const svgMarkup = decodeURIComponent(
    dataUrl.replace(/^data:image\/svg\+xml;charset=UTF-8,/, ''),
  );
  return new Blob([svgMarkup], { type: 'image/svg+xml' });
}

async function uploadPublicBlob(params: {
  bucket: string;
  path: string;
  blob: Blob;
  contentType: string;
}): Promise<string> {
  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.blob, {
      upsert: true,
      contentType: params.contentType,
    });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
  if (!publicUrl) throw new Error('Storage URL not returned.');
  return publicUrl;
}

async function uploadPrivateBlob(params: {
  bucket: string;
  path: string;
  blob: Blob;
  contentType: string;
}): Promise<void> {
  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.blob, {
      upsert: true,
      contentType: params.contentType,
    });
  if (error) throw error;
}

export async function uploadStructuredPublicAsset(params: {
  bucket: string;
  ownerId: string;
  scope: string;
  file: File;
  retainOriginal?: boolean;
}): Promise<StructuredPublicAssetUpload> {
  if (params.file.size > IMAGE_INPUT_MAX_BYTES) {
    throw new Error('File is too large to process safely.');
  }

  const { mimeType, mediaType } = assertSupportedUpload(params.file);
  const extension = getFileExtension(
    params.file.name,
    mediaType === 'doc' ? 'bin' : 'jpg',
  );
  const { assetId, path: originalPath } = buildStructuredMediaStoragePath({
    ownerId: params.ownerId,
    scope: params.scope,
    extension,
    stem: MEDIA_ORIGINAL_FILE_STEM,
  });

  if (mediaType === 'image') {
    const isAnimatedGif = mimeType === 'image/gif';
    const displayPath = deriveSiblingStoragePath(
      originalPath,
      MEDIA_DISPLAY_FILE_STEM,
      isAnimatedGif ? 'gif' : mimeType === 'image/png' ? 'png' : 'webp',
    );
    const thumbnailPath = deriveSiblingStoragePath(
      originalPath,
      MEDIA_THUMBNAIL_FILE_STEM,
      'jpg',
    );

    const originalUrl = params.retainOriginal
      ? await uploadPublicBlob({
          bucket: params.bucket,
          path: originalPath,
          blob: params.file,
          contentType: mimeType,
        })
      : null;

    if (isAnimatedGif) {
      const thumbnail = await renderImageBlob({
        file: params.file,
        longEdge: DEFAULT_THUMBNAIL_LONG_EDGE,
        mimeType: 'image/jpeg',
        quality: 0.82,
      });
      const displayUrl = await uploadPublicBlob({
        bucket: params.bucket,
        path: displayPath,
        blob: params.file,
        contentType: mimeType,
      });
      const thumbnailUrl = await uploadPublicBlob({
        bucket: params.bucket,
        path: thumbnailPath,
        blob: thumbnail.blob,
        contentType: 'image/jpeg',
      });
      return {
        assetId,
        mediaType,
        originalUrl: originalUrl ?? displayUrl,
        displayUrl,
        thumbnailUrl,
        width: null,
        height: null,
        sizeOriginal: params.file.size,
        sizeDisplay: params.file.size,
        sizeThumbnail: thumbnail.blob.size,
        mimeType,
        originalFilename: params.file.name,
      };
    }

    const { display, thumbnail } = await createImageDerivatives(params.file);
    const displayUrl = await uploadPublicBlob({
      bucket: params.bucket,
      path: displayPath,
      blob: display.blob,
      contentType: display.blob.type || 'image/webp',
    });
    const thumbnailUrl = await uploadPublicBlob({
      bucket: params.bucket,
      path: thumbnailPath,
      blob: thumbnail.blob,
      contentType: thumbnail.blob.type || 'image/jpeg',
    });
    return {
      assetId,
      mediaType,
      originalUrl: originalUrl ?? displayUrl,
      displayUrl,
      thumbnailUrl,
      width: display.width,
      height: display.height,
      sizeOriginal: params.file.size,
      sizeDisplay: display.blob.size,
      sizeThumbnail: thumbnail.blob.size,
      mimeType,
      originalFilename: params.file.name,
    };
  }

  const originalUrl = await uploadPublicBlob({
    bucket: params.bucket,
    path: originalPath,
    blob: params.file,
    contentType: mimeType,
  });
  const thumbnailPath = deriveSiblingStoragePath(
    originalPath,
    MEDIA_THUMBNAIL_FILE_STEM,
    'svg',
  );
  const displayPath = deriveSiblingStoragePath(
    originalPath,
    MEDIA_DISPLAY_FILE_STEM,
    'svg',
  );
  const thumbnailBlob = buildDocumentFallbackBlob(params.file);
  const thumbnailUrl = await uploadPublicBlob({
    bucket: params.bucket,
    path: thumbnailPath,
    blob: thumbnailBlob,
    contentType: 'image/svg+xml',
  });
  const displayUrl = await uploadPublicBlob({
    bucket: params.bucket,
    path: displayPath,
    blob: thumbnailBlob,
    contentType: 'image/svg+xml',
  });

  return {
    assetId,
    mediaType,
    originalUrl,
    displayUrl,
    thumbnailUrl,
    width: null,
    height: null,
    sizeOriginal: params.file.size,
    sizeDisplay: thumbnailBlob.size,
    sizeThumbnail: thumbnailBlob.size,
    mimeType,
    originalFilename: params.file.name,
  };
}

export async function uploadStructuredChatAttachment(params: {
  ownerId: string;
  file: File;
  accessToken?: string | null;
}): Promise<StructuredChatAttachmentUpload> {
  if (params.file.size > IMAGE_INPUT_MAX_BYTES) {
    throw new Error('File is too large to process safely.');
  }

  const { mimeType, mediaType } = assertSupportedUpload(params.file);

  if (mimeType === 'image/gif' && params.file.size > 2 * 1024 * 1024) {
    const processed = await processChatGifUpload({
      file: params.file,
      accessToken: params.accessToken ?? null,
    });
    const thumbnail = await renderImageBlob({
      file: params.file,
      longEdge: DEFAULT_THUMBNAIL_LONG_EDGE,
      mimeType: 'image/jpeg',
      quality: 0.82,
    });
    const thumbnailPath = deriveSiblingStoragePath(
      processed.path,
      MEDIA_THUMBNAIL_FILE_STEM,
      'jpg',
    );
    const originalPath = deriveSiblingStoragePath(
      processed.path,
      MEDIA_ORIGINAL_FILE_STEM,
      'gif',
    );
    await uploadPrivateBlob({
      bucket: 'chat-attachments',
      path: thumbnailPath,
      blob: thumbnail.blob,
      contentType: 'image/jpeg',
    });
    await uploadPrivateBlob({
      bucket: 'chat-attachments',
      path: originalPath,
      blob: params.file,
      contentType: mimeType,
    });
    return {
      assetId: processed.path.split('/').at(-2) ?? crypto.randomUUID(),
      storagePath: processed.path,
      displayPath: processed.path,
      thumbnailPath,
      mimeType: processed.mime,
      mediaType: 'video',
      size: processed.size,
      originalFilename: params.file.name,
    };
  }

  const extension = getFileExtension(params.file.name);
  const { assetId, path: originalPath } = buildStructuredMediaStoragePath({
    ownerId: params.ownerId,
    scope: 'attachments',
    extension,
    stem: MEDIA_ORIGINAL_FILE_STEM,
  });
  const displayPath = deriveSiblingStoragePath(
    originalPath,
    MEDIA_DISPLAY_FILE_STEM,
    mediaType === 'image'
      ? mimeType === 'image/gif'
        ? 'gif'
        : mimeType === 'image/png'
          ? 'png'
          : 'webp'
      : 'svg',
  );
  const thumbnailPath = deriveSiblingStoragePath(
    originalPath,
    MEDIA_THUMBNAIL_FILE_STEM,
    mediaType === 'doc' ? 'svg' : 'jpg',
  );

  await uploadPrivateBlob({
    bucket: 'chat-attachments',
    path: originalPath,
    blob: params.file,
    contentType: mimeType,
  });

  if (mediaType === 'image') {
    if (mimeType === 'image/gif') {
      const thumbnail = await renderImageBlob({
        file: params.file,
        longEdge: DEFAULT_THUMBNAIL_LONG_EDGE,
        mimeType: 'image/jpeg',
        quality: 0.82,
      });
      await uploadPrivateBlob({
        bucket: 'chat-attachments',
        path: displayPath,
        blob: params.file,
        contentType: mimeType,
      });
      await uploadPrivateBlob({
        bucket: 'chat-attachments',
        path: thumbnailPath,
        blob: thumbnail.blob,
        contentType: 'image/jpeg',
      });
      return {
        assetId,
        storagePath: originalPath,
        displayPath,
        thumbnailPath,
        mimeType,
        mediaType,
        size: params.file.size,
        originalFilename: params.file.name,
      };
    }

    const { display, thumbnail } = await createImageDerivatives(params.file);
    await uploadPrivateBlob({
      bucket: 'chat-attachments',
      path: displayPath,
      blob: display.blob,
      contentType: display.blob.type || 'image/webp',
    });
    await uploadPrivateBlob({
      bucket: 'chat-attachments',
      path: thumbnailPath,
      blob: thumbnail.blob,
      contentType: thumbnail.blob.type || 'image/jpeg',
    });
    return {
      assetId,
      storagePath: originalPath,
      displayPath,
      thumbnailPath,
      mimeType,
      mediaType,
      size: params.file.size,
      originalFilename: params.file.name,
    };
  }

  const fallbackBlob = buildDocumentFallbackBlob(params.file);
  await uploadPrivateBlob({
    bucket: 'chat-attachments',
    path: displayPath,
    blob: fallbackBlob,
    contentType: 'image/svg+xml',
  });
  await uploadPrivateBlob({
    bucket: 'chat-attachments',
    path: thumbnailPath,
    blob: fallbackBlob,
    contentType: 'image/svg+xml',
  });
  return {
    assetId,
    storagePath: originalPath,
    displayPath,
    thumbnailPath,
    mimeType,
    mediaType,
    size: params.file.size,
    originalFilename: params.file.name,
  };
}

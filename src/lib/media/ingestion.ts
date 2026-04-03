import { supabase } from '../auth/supabaseClient';
import { processChatGifUpload } from '../api/chatAttachmentsApi';
import {
  buildStructuredMediaStoragePath,
  deriveSiblingStoragePath,
  getStructuredMediaDerivativeExtensions,
  MEDIA_DISPLAY_FILE_STEM,
  MEDIA_ORIGINAL_FILE_STEM,
  MEDIA_THUMBNAIL_FILE_STEM,
} from './assets';
import {
  buildDocumentPreviewBlob,
  extractDocumentPreviewTextFromFile,
  getDocumentMimeTypeForName,
  isSupportedDocumentMimeType,
} from './documents';
import {
  CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES,
  STRUCTURED_MEDIA_INPUT_HARD_LIMIT_BYTES,
} from './mediaSizePolicy';
import { reportMediaTelemetryAsync } from './telemetry';

const DEFAULT_DISPLAY_LONG_EDGE = 1600;
const DEFAULT_THUMBNAIL_LONG_EDGE = 480;

type CanvasRenderResult = {
  blob: Blob;
  width: number;
  height: number;
};

const FILE_EXTENSION_PATTERN = /\.([a-z0-9]+)(?:$|\?)/i;

function trackStructuredTransformTelemetry(params: {
  eventName: string;
  stage: 'optimization' | 'preview';
  surface: string;
  requestId: string;
  mimeType: string;
  inputBytes: number;
  outputBytes?: number | null;
  thumbnailBytes?: number | null;
  failureReason?: string | null;
  status: 'ready' | 'failed';
  pipeline: 'structured_public_asset' | 'structured_chat_attachment';
}) {
  reportMediaTelemetryAsync({
    eventName: params.eventName,
    stage: params.stage,
    surface: params.surface,
    requestId: params.requestId,
    pipeline: params.pipeline,
    status: params.status,
    failureCode: params.status === 'failed' ? 'compression_failed' : undefined,
    failureReason: params.failureReason ?? undefined,
    meta: {
      inputBytes: params.inputBytes,
      outputBytes: params.outputBytes ?? null,
      thumbnailBytes: params.thumbnailBytes ?? null,
      bytesSaved:
        typeof params.outputBytes === 'number'
          ? Math.max(0, params.inputBytes - params.outputBytes)
          : null,
      mimeType: params.mimeType,
    },
  });
}

function getImageDisplayExtension(mimeType: string): 'gif' | 'png' | 'webp' {
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/png') return 'png';
  return 'webp';
}

function getChatAttachmentDisplayExtension(
  mediaType: StructuredChatAttachmentUpload['mediaType'],
  mimeType: string,
): 'gif' | 'png' | 'webp' | 'svg' | 'mp4' {
  return getStructuredMediaDerivativeExtensions({ mediaType, mimeType })
    .displayExtension;
}

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

type StructuredPublicAssetLimits = {
  maxDisplayBytes?: number | null;
  displayLimitFailureMessage?: string | null;
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
  const match = FILE_EXTENSION_PATTERN.exec(fileName.toLowerCase());
  return match?.[1] ?? fallback;
}

function isSupportedImageMime(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
    mimeType,
  );
}

function isSupportedDocumentMime(mimeType: string): boolean {
  return isSupportedDocumentMimeType(mimeType);
}

function isSupportedVideoMime(mimeType: string): boolean {
  return ['video/mp4', 'video/webm', 'video/quicktime'].includes(mimeType);
}

function normalizeMimeFromFile(file: File): string {
  const mimeType = file.type.toLowerCase().trim();
  if (mimeType) return mimeType;
  const documentMime = getDocumentMimeTypeForName(file.name);
  if (documentMime) return documentMime;
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

async function buildDocumentPreviewImageBlob(file: File): Promise<Blob> {
  const mimeType = normalizeMimeFromFile(file);
  const excerpt = await extractDocumentPreviewTextFromFile(file);
  return buildDocumentPreviewBlob({
    fileName: file.name,
    mimeType,
    sizeBytes: file.size,
    excerpt,
  });
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

function assertStructuredDisplaySizeWithinLimit(
  params: StructuredPublicAssetLimits,
  displaySize: number,
): void {
  if (params.maxDisplayBytes == null || displaySize <= params.maxDisplayBytes) {
    return;
  }
  throw new Error(
    params.displayLimitFailureMessage?.trim() ||
      'Processed media is still too large after optimization. Try a smaller or simpler file.',
  );
}

export async function uploadStructuredPublicAsset(
  params: {
    bucket: string;
    ownerId: string;
    scope: string;
    file: File;
    retainOriginal?: boolean;
  } & StructuredPublicAssetLimits,
): Promise<StructuredPublicAssetUpload> {
  if (params.file.size > STRUCTURED_MEDIA_INPUT_HARD_LIMIT_BYTES) {
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
    const displayExtension = getImageDisplayExtension(mimeType);
    const displayPath = deriveSiblingStoragePath(
      originalPath,
      MEDIA_DISPLAY_FILE_STEM,
      displayExtension,
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
      assertStructuredDisplaySizeWithinLimit(params, params.file.size);
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

    let display: CanvasRenderResult;
    let thumbnail: CanvasRenderResult;
    try {
      ({ display, thumbnail } = await createImageDerivatives(params.file));
      assertStructuredDisplaySizeWithinLimit(params, display.blob.size);
      trackStructuredTransformTelemetry({
        eventName: 'media_derivative_compression_succeeded',
        stage: 'optimization',
        surface: params.bucket,
        requestId: assetId,
        mimeType,
        inputBytes: params.file.size,
        outputBytes: display.blob.size,
        thumbnailBytes: thumbnail.blob.size,
        status: 'ready',
        pipeline: 'structured_public_asset',
      });
    } catch (error) {
      trackStructuredTransformTelemetry({
        eventName: 'media_derivative_compression_failed',
        stage: 'optimization',
        surface: params.bucket,
        requestId: assetId,
        mimeType,
        inputBytes: params.file.size,
        failureReason: error instanceof Error ? error.message : String(error),
        status: 'failed',
        pipeline: 'structured_public_asset',
      });
      throw error;
    }
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
  let thumbnailBlob: Blob;
  try {
    thumbnailBlob = await buildDocumentPreviewImageBlob(params.file);
    trackStructuredTransformTelemetry({
      eventName: 'media_document_preview_succeeded',
      stage: 'preview',
      surface: params.bucket,
      requestId: assetId,
      mimeType,
      inputBytes: params.file.size,
      outputBytes: thumbnailBlob.size,
      thumbnailBytes: thumbnailBlob.size,
      status: 'ready',
      pipeline: 'structured_public_asset',
    });
  } catch (error) {
    trackStructuredTransformTelemetry({
      eventName: 'media_document_preview_failed',
      stage: 'preview',
      surface: params.bucket,
      requestId: assetId,
      mimeType,
      inputBytes: params.file.size,
      failureReason: error instanceof Error ? error.message : String(error),
      status: 'failed',
      pipeline: 'structured_public_asset',
    });
    throw error;
  }
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
  if (params.file.size > STRUCTURED_MEDIA_INPUT_HARD_LIMIT_BYTES) {
    throw new Error('File is too large to process safely.');
  }

  const { mimeType, mediaType } = assertSupportedUpload(params.file);

  if (
    mimeType === 'image/gif' &&
    params.file.size > CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES
  ) {
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
    getChatAttachmentDisplayExtension(mediaType, mimeType),
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

    let display: CanvasRenderResult;
    let thumbnail: CanvasRenderResult;
    try {
      ({ display, thumbnail } = await createImageDerivatives(params.file));
      trackStructuredTransformTelemetry({
        eventName: 'media_derivative_compression_succeeded',
        stage: 'optimization',
        surface: 'chat_attachment',
        requestId: assetId,
        mimeType,
        inputBytes: params.file.size,
        outputBytes: display.blob.size,
        thumbnailBytes: thumbnail.blob.size,
        status: 'ready',
        pipeline: 'structured_chat_attachment',
      });
    } catch (error) {
      trackStructuredTransformTelemetry({
        eventName: 'media_derivative_compression_failed',
        stage: 'optimization',
        surface: 'chat_attachment',
        requestId: assetId,
        mimeType,
        inputBytes: params.file.size,
        failureReason: error instanceof Error ? error.message : String(error),
        status: 'failed',
        pipeline: 'structured_chat_attachment',
      });
      throw error;
    }
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

  let fallbackBlob: Blob;
  try {
    fallbackBlob = await buildDocumentPreviewImageBlob(params.file);
    trackStructuredTransformTelemetry({
      eventName: 'media_document_preview_succeeded',
      stage: 'preview',
      surface: 'chat_attachment',
      requestId: assetId,
      mimeType,
      inputBytes: params.file.size,
      outputBytes: fallbackBlob.size,
      thumbnailBytes: fallbackBlob.size,
      status: 'ready',
      pipeline: 'structured_chat_attachment',
    });
  } catch (error) {
    trackStructuredTransformTelemetry({
      eventName: 'media_document_preview_failed',
      stage: 'preview',
      surface: 'chat_attachment',
      requestId: assetId,
      mimeType,
      inputBytes: params.file.size,
      failureReason: error instanceof Error ? error.message : String(error),
      status: 'failed',
      pipeline: 'structured_chat_attachment',
    });
    throw error;
  }
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

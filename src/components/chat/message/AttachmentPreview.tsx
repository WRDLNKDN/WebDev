import { Box } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/auth/supabaseClient';
import { AssetInlinePreview } from '../../media/AssetThumbnail';
import {
  createChatAttachmentStorageDescriptor,
  deriveSiblingStoragePath,
  getStructuredMediaDerivativeExtensions,
  MEDIA_DISPLAY_FILE_STEM,
  MEDIA_THUMBNAIL_FILE_STEM,
  type ResolvedChatAttachmentAsset,
} from '../../../lib/media/assets';
import { getDocumentInteractionPolicy } from '../../../lib/media/documents';
import { reportMediaTelemetryAsync } from '../../../lib/media/telemetry';

type AttachmentPreviewProps = {
  path: string;
  mimeType: string;
  attachmentId?: string;
  fileSize?: number;
  createdAt?: string;
};

const signedUrlCache = new Map<string, Promise<string | null>>();

const CHAT_ATTACHMENT_FRAME_SX = {
  width: '100%',
  maxWidth: { xs: 280, sm: 420, md: 520 },
  borderRadius: 1.5,
  overflow: 'hidden',
  boxShadow: (theme: Theme) =>
    `0 0 0 1px ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.1 : 0.12)} inset`,
} as const;

async function createSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const cached = signedUrlCache.get(path);
  if (cached) return cached;

  const pending = supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 3600)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) {
        signedUrlCache.delete(path);
        return null;
      }
      return data.signedUrl;
    })
    .catch(() => {
      signedUrlCache.delete(path);
      return null;
    });

  signedUrlCache.set(path, pending);
  return pending;
}

function getStructuredDerivativePaths(
  storagePath: string,
  mimeType: string,
): {
  originalPath: string;
  displayPath: string;
  thumbnailPath: string | null;
} {
  const lowerMime = mimeType.toLowerCase();
  const structuredOriginal = /\/original\./.test(storagePath);
  const mediaType = lowerMime.startsWith('image/')
    ? 'image'
    : lowerMime.startsWith('video/')
      ? 'video'
      : 'doc';
  const { displayExtension, thumbnailExtension } =
    getStructuredMediaDerivativeExtensions({
      mediaType,
      mimeType,
    });
  if (!structuredOriginal) {
    return {
      originalPath: storagePath,
      displayPath: storagePath,
      thumbnailPath: deriveSiblingStoragePath(
        storagePath,
        MEDIA_THUMBNAIL_FILE_STEM,
        thumbnailExtension,
      ),
    };
  }

  return {
    originalPath: storagePath,
    displayPath: deriveSiblingStoragePath(
      storagePath,
      MEDIA_DISPLAY_FILE_STEM,
      displayExtension,
    ),
    thumbnailPath: deriveSiblingStoragePath(
      storagePath,
      MEDIA_THUMBNAIL_FILE_STEM,
      thumbnailExtension,
    ),
  };
}

async function resolveAttachmentUrls(
  derivatives: ReturnType<typeof getStructuredDerivativePaths>,
  mimeType: string,
): Promise<{
  originalUrl: string | null;
  displayUrl: string | null;
  thumbnailUrl: string | null;
}> {
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.startsWith('image/')) {
    // Chat threads only need the display image up front; avoid signing unused
    // sibling files for every inline image on initial render.
    const displayUrl = await createSignedUrl(derivatives.displayPath);
    return {
      originalUrl: displayUrl,
      displayUrl,
      thumbnailUrl: displayUrl,
    };
  }

  if (lowerMime.startsWith('video/')) {
    const [displayUrl, thumbnailUrl] = await Promise.all([
      createSignedUrl(derivatives.displayPath),
      createSignedUrl(derivatives.thumbnailPath),
    ]);
    return {
      originalUrl: displayUrl,
      displayUrl,
      thumbnailUrl,
    };
  }

  const [originalUrl, thumbnailUrl] = await Promise.all([
    createSignedUrl(derivatives.originalPath),
    createSignedUrl(derivatives.thumbnailPath),
  ]);
  return {
    originalUrl,
    displayUrl: originalUrl,
    thumbnailUrl,
  };
}

export const AttachmentPreview = ({
  path,
  mimeType,
  attachmentId = path,
  fileSize = 0,
  createdAt,
}: AttachmentPreviewProps) => {
  const [asset, setAsset] = useState<ResolvedChatAttachmentAsset | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAsset(null);
    setLoadFailed(false);

    const derivatives = getStructuredDerivativePaths(path, mimeType);

    void (async () => {
      const { originalUrl, displayUrl, thumbnailUrl } =
        await resolveAttachmentUrls(derivatives, mimeType);
      if (cancelled) return;
      if (!originalUrl && !displayUrl && !thumbnailUrl) {
        reportMediaTelemetryAsync({
          eventName: 'chat_attachment_preview_resolution_failed',
          stage: 'preview',
          surface: 'chat_attachment',
          assetId: attachmentId,
          requestId: path,
          pipeline: 'chat_attachment_preview',
          status: 'failed',
          failureCode: 'signed_url_unavailable',
          failureReason: 'Signed URL generation returned no renderable media.',
          meta: {
            mimeType,
            storagePath: path,
          },
        });
        setLoadFailed(true);
        return;
      }
      reportMediaTelemetryAsync({
        eventName: 'chat_attachment_preview_resolved',
        stage: 'preview',
        surface: 'chat_attachment',
        assetId: attachmentId,
        requestId: path,
        pipeline: 'chat_attachment_preview',
        status: 'ready',
        meta: {
          mimeType,
          hasOriginal: Boolean(originalUrl),
          hasDisplay: Boolean(displayUrl),
          hasThumbnail: Boolean(thumbnailUrl),
        },
      });
      setAsset(
        createChatAttachmentStorageDescriptor(
          {
            id: attachmentId,
            message_id: '',
            storage_path: path,
            mime_type: mimeType,
            file_size: fileSize,
            created_at: createdAt ?? new Date().toISOString(),
          },
          {
            originalUrl,
            displayUrl: displayUrl ?? originalUrl,
            thumbnailUrl,
          },
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [attachmentId, createdAt, fileSize, mimeType, path]);

  if (!asset) {
    return (
      <Box
        sx={{
          ...CHAT_ATTACHMENT_FRAME_SX,
          boxShadow: (theme: Theme) =>
            `0 0 0 1px ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.12 : 0.14)} inset`,
        }}
      >
        <Box
          sx={{
            p: 1,
            bgcolor: 'rgba(0,0,0,0.3)',
            fontSize: 12,
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {loadFailed ? 'Attachment unavailable' : 'Loading attachment...'}
        </Box>
      </Box>
    );
  }

  const documentPolicy =
    asset.mediaType === 'doc'
      ? getDocumentInteractionPolicy({
          url: asset.originalUrl ?? asset.displayUrl ?? null,
          mimeType,
          fileName: asset.originalFilename,
        })
      : null;
  const altText =
    mimeType.toLowerCase() === 'image/gif'
      ? 'GIF attachment'
      : 'Attachment preview';
  const href =
    documentPolicy?.openUrl ||
    asset.originalUrl ||
    asset.displayUrl ||
    undefined;
  const ariaLabel = documentPolicy
    ? documentPolicy.preferDownload
      ? 'Download document attachment'
      : 'Open document attachment'
    : 'Open attachment';

  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download={documentPolicy?.preferDownload ? '' : undefined}
      aria-label={ariaLabel}
      sx={{
        display: 'block',
        ...CHAT_ATTACHMENT_FRAME_SX,
        textDecoration: 'none',
        cursor: documentPolicy?.preferDownload ? 'pointer' : 'zoom-in',
      }}
    >
      <AssetInlinePreview
        asset={asset}
        alt={altText}
        surface="chat"
        sx={{
          border: 'none',
          borderRadius: 0,
          bgcolor:
            asset.mediaType === 'image' || asset.mediaType === 'video'
              ? 'rgba(0,0,0,0.24)'
              : 'rgba(0,0,0,0.18)',
        }}
        mediaSx={{ objectPosition: 'center' }}
      />
    </Box>
  );
};

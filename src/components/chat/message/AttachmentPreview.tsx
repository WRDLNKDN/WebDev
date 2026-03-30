import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/auth/supabaseClient';
import { AssetThumbnail } from '../../media/AssetThumbnail';
import {
  createChatAttachmentStorageDescriptor,
  deriveSiblingStoragePath,
  MEDIA_DISPLAY_FILE_STEM,
  MEDIA_THUMBNAIL_FILE_STEM,
  type ResolvedChatAttachmentAsset,
} from '../../../lib/media/assets';

type AttachmentPreviewProps = {
  path: string;
  mimeType: string;
  attachmentId?: string;
  fileSize?: number;
  createdAt?: string;
};

async function createSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
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
  const isVisualMime =
    lowerMime.startsWith('video/') || lowerMime.startsWith('image/');
  if (!structuredOriginal) {
    const thumbExtension = isVisualMime ? 'jpg' : 'svg';
    return {
      originalPath: storagePath,
      displayPath: storagePath,
      thumbnailPath: deriveSiblingStoragePath(
        storagePath,
        MEDIA_THUMBNAIL_FILE_STEM,
        thumbExtension,
      ),
    };
  }

  let displayExtension = 'svg';
  if (lowerMime.startsWith('image/gif')) {
    displayExtension = 'gif';
  } else if (lowerMime.startsWith('image/png')) {
    displayExtension = 'png';
  } else if (lowerMime.startsWith('image/')) {
    displayExtension = 'webp';
  }
  const usesDocumentThumbnail =
    lowerMime.includes('pdf') ||
    lowerMime.includes('word') ||
    lowerMime.includes('document') ||
    lowerMime.includes('presentation') ||
    lowerMime.includes('sheet') ||
    lowerMime.startsWith('text/');
  const thumbnailExtension = usesDocumentThumbnail ? 'svg' : 'jpg';

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
      const [originalUrl, displayUrl, thumbnailUrl] = await Promise.all([
        createSignedUrl(derivatives.originalPath),
        createSignedUrl(derivatives.displayPath),
        createSignedUrl(derivatives.thumbnailPath),
      ]);
      if (cancelled) return;
      if (!originalUrl && !displayUrl && !thumbnailUrl) {
        setLoadFailed(true);
        return;
      }
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
          width: 'min(100%, 360px)',
          maxWidth: 360,
          borderRadius: 1.5,
          overflow: 'hidden',
          boxShadow: (t) =>
            `0 0 0 1px ${alpha(t.palette.divider, t.palette.mode === 'light' ? 0.12 : 0.14)} inset`,
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

  return (
    <Box
      component="a"
      href={asset.originalUrl ?? asset.displayUrl ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        asset.mediaType === 'doc'
          ? 'Open document attachment'
          : 'Open attachment'
      }
      sx={{
        display: 'block',
        width: 'min(100%, 360px)',
        maxWidth: 360,
        borderRadius: 1.5,
        overflow: 'hidden',
        boxShadow: (t) =>
          `0 0 0 1px ${alpha(t.palette.divider, t.palette.mode === 'light' ? 0.1 : 0.12)} inset`,
        textDecoration: 'none',
      }}
    >
      <AssetThumbnail
        asset={asset}
        alt={
          mimeType.toLowerCase() === 'image/gif'
            ? 'GIF attachment'
            : 'Attachment preview'
        }
        compact
        sx={{
          minHeight: 0,
          maxHeight: 280,
          aspectRatio: '1 / 1',
          borderBottom: 'none',
        }}
      />
    </Box>
  );
};

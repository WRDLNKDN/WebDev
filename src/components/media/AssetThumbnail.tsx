import { Box, LinearProgress, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { NormalizedAsset } from '../../lib/media/assets';
import {
  getNormalizedAssetDisplayUrl,
  getNormalizedAssetThumbnailUrl,
} from '../../lib/media/assets';

type AssetThumbnailProps = {
  asset: NormalizedAsset;
  alt: string;
  compact?: boolean;
  loadingLabel?: string;
  sx?: SxProps<Theme>;
  mediaSx?: SxProps<Theme>;
};

export const AssetThumbnail = ({
  asset,
  alt,
  compact = false,
  loadingLabel,
  sx,
  mediaSx,
}: AssetThumbnailProps) => {
  const thumbnailUrl = getNormalizedAssetThumbnailUrl(asset);
  const displayUrl = getNormalizedAssetDisplayUrl(asset);
  const pending =
    asset.processingState === 'uploading' ||
    asset.processingState === 'optimizing' ||
    asset.processingState === 'converting';
  const failed = asset.processingState === 'failed';

  return (
    <Box
      sx={[
        {
          width: '100%',
          minHeight: { xs: 72, sm: 80 },
          aspectRatio: '16 / 9',
          maxHeight: { xs: 88, md: 100 },
          flexShrink: 0,
          overflow: 'hidden',
          bgcolor: 'rgba(0,0,0,0.28)',
          borderBottom: '1px solid rgba(156,187,217,0.18)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {asset.mediaType === 'video' && displayUrl ? (
        <Box
          component="video"
          src={displayUrl}
          poster={thumbnailUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt}
          sx={[
            {
              width: '100%',
              height: '100%',
              objectFit: compact ? 'cover' : 'contain',
              display: 'block',
              bgcolor: 'black',
            },
            ...(Array.isArray(mediaSx) ? mediaSx : [mediaSx]),
          ]}
        />
      ) : (
        <Box
          component="img"
          src={
            asset.mediaType === 'image' && displayUrl
              ? displayUrl
              : thumbnailUrl
          }
          alt={alt}
          loading="lazy"
          width={400}
          height={300}
          sx={[
            {
              width: '100%',
              height: '100%',
              objectFit: compact ? 'cover' : 'contain',
              objectPosition: asset.mediaType === 'doc' ? 'center' : 'top',
              display: 'block',
            },
            ...(Array.isArray(mediaSx) ? mediaSx : [mediaSx]),
          ]}
        />
      )}

      {pending ? (
        <>
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              borderRadius: 0,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': { bgcolor: 'primary.light' },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 10,
              right: 10,
              px: 0.75,
              py: 0.35,
              borderRadius: 1,
              bgcolor: 'rgba(15,23,42,0.7)',
              color: '#e2e8f0',
              textAlign: 'center',
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}
          >
            {loadingLabel ?? 'Processing preview…'}
          </Typography>
        </>
      ) : null}

      {failed ? (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 10,
            right: 10,
            px: 0.75,
            py: 0.35,
            borderRadius: 1,
            bgcolor: 'rgba(127,29,29,0.72)',
            color: '#fee2e2',
            textAlign: 'center',
            fontWeight: 600,
            backdropFilter: 'blur(4px)',
          }}
        >
          Preview unavailable
        </Typography>
      ) : null}
    </Box>
  );
};

import { Box, LinearProgress, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
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

const THUMBNAIL_FRAME_SX: SystemStyleObject<Theme> = {
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
};

const THUMBNAIL_MEDIA_BASE_SX = (
  compact: boolean,
): SystemStyleObject<Theme> => ({
  width: '100%',
  height: '100%',
  objectFit: compact ? 'cover' : 'contain',
  display: 'block',
});

const THUMBNAIL_OVERLAY_LABEL_SX: SystemStyleObject<Theme> = {
  position: 'absolute',
  bottom: 8,
  left: 10,
  right: 10,
  px: 0.75,
  py: 0.35,
  borderRadius: 1,
  textAlign: 'center',
  fontWeight: 600,
  backdropFilter: 'blur(4px)',
};

function mergeSx(
  base: SystemStyleObject<Theme>,
  extra?: SxProps<Theme>,
): SxProps<Theme> {
  if (!extra) return base;
  return [base, ...(Array.isArray(extra) ? extra : [extra])];
}

function renderAssetMedia(params: {
  asset: NormalizedAsset;
  alt: string;
  compact: boolean;
  displayUrl: string;
  thumbnailUrl: string;
  mediaSx?: SxProps<Theme>;
}) {
  const { asset, alt, compact, displayUrl, thumbnailUrl, mediaSx } = params;
  if (asset.mediaType === 'video' && displayUrl) {
    return (
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
        sx={mergeSx(
          {
            ...THUMBNAIL_MEDIA_BASE_SX(compact),
            bgcolor: 'black',
          },
          mediaSx,
        )}
      />
    );
  }

  const imageSrc =
    asset.mediaType === 'image' && displayUrl ? displayUrl : thumbnailUrl;

  return (
    <Box
      component="img"
      src={imageSrc}
      alt={alt}
      loading="lazy"
      width={400}
      height={300}
      sx={mergeSx(
        {
          ...THUMBNAIL_MEDIA_BASE_SX(compact),
          objectPosition: asset.mediaType === 'doc' ? 'center' : 'top',
        },
        mediaSx,
      )}
    />
  );
}

const ProcessingOverlay = ({ loadingLabel }: { loadingLabel?: string }) => (
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
        ...THUMBNAIL_OVERLAY_LABEL_SX,
        bgcolor: 'rgba(15,23,42,0.7)',
        color: '#e2e8f0',
      }}
    >
      {loadingLabel ?? 'Processing preview…'}
    </Typography>
  </>
);

const FailedOverlay = () => (
  <Typography
    variant="caption"
    sx={{
      ...THUMBNAIL_OVERLAY_LABEL_SX,
      bgcolor: 'rgba(127,29,29,0.72)',
      color: '#fee2e2',
    }}
  >
    Preview unavailable
  </Typography>
);

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
  const pending = ['uploading', 'optimizing', 'converting'].includes(
    asset.processingState,
  );
  const failed = asset.processingState === 'failed';

  return (
    <Box sx={mergeSx(THUMBNAIL_FRAME_SX, sx)}>
      {renderAssetMedia({
        asset,
        alt,
        compact,
        displayUrl,
        thumbnailUrl,
        mediaSx,
      })}

      {pending ? <ProcessingOverlay loadingLabel={loadingLabel} /> : null}

      {failed ? <FailedOverlay /> : null}
    </Box>
  );
};

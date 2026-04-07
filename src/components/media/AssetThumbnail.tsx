import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { useEffect, useRef } from 'react';
import {
  getNormalizedAssetDisplayUrl,
  getNormalizedAssetThumbnailUrl,
  type NormalizedAsset,
} from '../../lib/media/assets';
import { normalizedAssetToMediaStatusInput } from '../../lib/media/mediaStatus';
import { MediaPreviewStatusOverlay } from './MediaPreviewStatusOverlay';
import { reportMediaTelemetryAsync } from '../../lib/media/telemetry';
import {
  ProfileAvatar,
  type ProfileAvatarProps,
} from '../avatar/ProfileAvatar';

type AssetThumbnailProps = {
  asset: NormalizedAsset;
  alt: string;
  compact?: boolean;
  loadingLabel?: string;
  sx?: SxProps<Theme>;
  mediaSx?: SxProps<Theme>;
  onAssetRetry?: (() => void) | null;
  assetRetryBusy?: boolean;
  showAssetDiagnostics?: boolean;
};

type AssetInlinePreviewProps = {
  asset: NormalizedAsset;
  alt: string;
  surface?: InlineMediaSurface;
  loadingLabel?: string;
  sx?: SxProps<Theme>;
  mediaSx?: SxProps<Theme>;
  onAssetRetry?: (() => void) | null;
  assetRetryBusy?: boolean;
  showAssetDiagnostics?: boolean;
};

type AssetAvatarProps = Omit<ProfileAvatarProps, 'src'> & {
  asset: NormalizedAsset | null;
};

type SharedMediaRendererProps = {
  src: string;
  alt: string;
  sx?: SxProps<Theme>;
  objectFit?: 'cover' | 'contain';
  objectPosition?: string;
  sizing?: 'fill-frame' | 'natural';
  intrinsicWidth?: number | null;
  intrinsicHeight?: number | null;
  onReady?: () => void;
  onLoad?: () => void;
  onError?: () => void;
};

type AssetFallbackNoticeProps = {
  label: string;
  tone?: 'default' | 'error';
  overlay?: boolean;
  sx?: SxProps<Theme>;
};

const ASSET_PROCESSING_PENDING_STATES = [
  'uploading',
  'optimizing',
  'converting',
];

export type InlineMediaSurface = 'default' | 'chat' | 'feed' | 'portfolio';
export type InlineMediaShape =
  | 'unknown'
  | 'portrait'
  | 'square'
  | 'landscape'
  | 'panorama';

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

const INLINE_FRAME_BASE_SX: SystemStyleObject<Theme> = {
  width: '100%',
  borderRadius: 1.5,
  overflow: 'hidden',
  bgcolor: 'rgba(0,0,0,0.28)',
  border: '1px solid',
  borderColor: 'divider',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const THUMBNAIL_MEDIA_BASE_SX: SystemStyleObject<Theme> = {
  width: '100%',
  height: '100%',
  display: 'block',
};

const INLINE_MEDIA_SURFACE_MAX_HEIGHTS = {
  default: { xs: 280, sm: 360, md: 420 },
  chat: { xs: 280, sm: 360, md: 440 },
  feed: { xs: 240, sm: 320, md: 360 },
  portfolio: { xs: 320, sm: 420, md: 520 },
} as const;

const INLINE_MEDIA_PLACEHOLDER_MIN_HEIGHTS = {
  default: { xs: 160, sm: 180 },
  chat: { xs: 168, sm: 192 },
  feed: { xs: 156, sm: 176 },
  portfolio: { xs: 220, sm: 260 },
} as const;

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

function getRenderableAssetUrls(asset: NormalizedAsset) {
  const thumbnailUrl = getNormalizedAssetThumbnailUrl(asset);
  const displayUrl = getNormalizedAssetDisplayUrl(asset);
  return {
    displayUrl,
    thumbnailUrl,
    imageUrl:
      asset.mediaType === 'image' || asset.mediaType === 'link'
        ? displayUrl || thumbnailUrl
        : thumbnailUrl,
  };
}

export function classifyInlineMediaShape(
  asset: Pick<NormalizedAsset, 'width' | 'height'>,
): InlineMediaShape {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  if (width <= 0 || height <= 0) return 'unknown';

  const ratio = width / height;
  if (ratio <= 0.8) return 'portrait';
  if (ratio >= 2) return 'panorama';
  if (ratio >= 1.15) return 'landscape';
  return 'square';
}

export function getInlineMediaSurfaceMaxHeight(
  surface: InlineMediaSurface = 'default',
) {
  return INLINE_MEDIA_SURFACE_MAX_HEIGHTS[surface];
}

export function getInlineMediaPresentation(params: {
  asset: Pick<NormalizedAsset, 'width' | 'height' | 'mediaType'>;
  surface?: InlineMediaSurface;
}) {
  const { asset, surface = 'default' } = params;
  const shape = classifyInlineMediaShape(asset);
  const maxHeight = getInlineMediaSurfaceMaxHeight(surface);
  const isPortrait = shape === 'portrait';
  const isUnknown = shape === 'unknown';
  /** Feed: always span the post column so portrait shots are not a narrow centered strip. */
  const feedSpansPostColumn = surface === 'feed' && asset.mediaType !== 'doc';
  const prefersFullWidth = !isPortrait || isUnknown || feedSpansPostColumn;
  const mediaWidth =
    asset.mediaType === 'doc' || prefersFullWidth ? '100%' : 'auto';

  return {
    shape,
    mediaSx: {
      display: 'block',
      width: mediaWidth,
      height: 'auto',
      maxWidth: '100%',
      maxHeight,
      marginInline: 'auto',
    } satisfies SystemStyleObject<Theme>,
    placeholderMinHeight: INLINE_MEDIA_PLACEHOLDER_MIN_HEIGHTS[surface],
  };
}

function getMediaSizingBaseSx(
  sizing: SharedMediaRendererProps['sizing'] = 'fill-frame',
): SystemStyleObject<Theme> {
  if (sizing === 'natural') {
    return {
      display: 'block',
      maxWidth: '100%',
      width: 'auto',
      height: 'auto',
      marginInline: 'auto',
    };
  }

  return THUMBNAIL_MEDIA_BASE_SX;
}

function sxPropsToArray(sx: SxProps<Theme> | undefined) {
  if (sx == null) return [];
  if (Array.isArray(sx)) return sx;
  return [sx];
}

export const AssetFallbackNotice = ({
  label,
  tone = 'default',
  overlay = false,
  sx,
}: AssetFallbackNoticeProps) => (
  <Typography
    variant="caption"
    sx={[
      overlay
        ? {
            ...THUMBNAIL_OVERLAY_LABEL_SX,
            bgcolor:
              tone === 'error' ? 'rgba(127,29,29,0.72)' : 'rgba(15,23,42,0.7)',
            color: tone === 'error' ? '#fee2e2' : '#e2e8f0',
          }
        : {
            px: 1,
            py: 0.75,
            borderRadius: 1.25,
            bgcolor:
              tone === 'error' ? 'rgba(127,29,29,0.18)' : 'rgba(15,23,42,0.18)',
            color: tone === 'error' ? '#fecaca' : 'text.secondary',
            textAlign: 'center',
            fontWeight: 600,
          },
      ...sxPropsToArray(sx),
    ]}
  >
    {label}
  </Typography>
);

export const InlineImageRenderer = ({
  src,
  alt,
  sx,
  objectFit = 'cover',
  objectPosition = 'center',
  sizing = 'fill-frame',
  intrinsicWidth,
  intrinsicHeight,
  onReady,
  onLoad,
  onError,
}: SharedMediaRendererProps) => (
  <Box
    component="img"
    src={src}
    alt={alt}
    loading="lazy"
    width={intrinsicWidth ?? 400}
    height={intrinsicHeight ?? 300}
    onLoad={() => {
      onLoad?.();
      onReady?.();
    }}
    onError={() => onError?.()}
    sx={mergeSx(
      {
        ...getMediaSizingBaseSx(sizing),
        objectFit,
        objectPosition,
      },
      sx,
    )}
  />
);

export const AnimatedMediaRenderer = ({
  src,
  alt,
  sx,
  objectFit = 'contain',
  objectPosition = 'center',
  poster,
  sizing = 'fill-frame',
  intrinsicWidth,
  intrinsicHeight,
  onReady,
  onError,
}: SharedMediaRendererProps & { poster?: string | null }) => (
  <Box
    component="video"
    src={src}
    poster={poster ?? undefined}
    width={intrinsicWidth ?? undefined}
    height={intrinsicHeight ?? undefined}
    autoPlay
    muted
    loop
    playsInline
    preload="metadata"
    aria-label={alt}
    onLoadedData={() => onReady?.()}
    onError={() => onError?.()}
    sx={mergeSx(
      {
        ...getMediaSizingBaseSx(sizing),
        objectFit,
        objectPosition,
        bgcolor: 'black',
      },
      sx,
    )}
  />
);

export const DocumentPreviewRenderer = ({
  src,
  alt,
  sx,
  sizing,
  intrinsicWidth,
  intrinsicHeight,
  onReady,
  onError,
}: SharedMediaRendererProps) => (
  <InlineImageRenderer
    src={src}
    alt={alt}
    objectFit="contain"
    objectPosition="center"
    sizing={sizing}
    intrinsicWidth={intrinsicWidth}
    intrinsicHeight={intrinsicHeight}
    onReady={onReady}
    onError={onError}
    sx={sx}
  />
);

function renderAssetVisual(params: {
  asset: NormalizedAsset;
  alt: string;
  compact: boolean;
  displayUrl: string;
  thumbnailUrl: string;
  mediaSx?: SxProps<Theme>;
  onVisualReady?: () => void;
  onVisualError?: () => void;
}) {
  const {
    asset,
    alt,
    compact,
    displayUrl,
    thumbnailUrl,
    mediaSx,
    onVisualReady,
    onVisualError,
  } = params;

  if (asset.mediaType === 'video' && displayUrl) {
    return (
      <AnimatedMediaRenderer
        src={displayUrl}
        poster={thumbnailUrl}
        alt={alt}
        objectFit={compact ? 'cover' : 'contain'}
        sizing={compact ? 'fill-frame' : 'natural'}
        intrinsicWidth={asset.width}
        intrinsicHeight={asset.height}
        onReady={onVisualReady}
        onError={onVisualError}
        sx={mediaSx}
      />
    );
  }

  if (asset.mediaType === 'doc') {
    return (
      <DocumentPreviewRenderer
        src={thumbnailUrl}
        alt={alt}
        sizing={compact ? 'fill-frame' : 'natural'}
        intrinsicWidth={asset.width}
        intrinsicHeight={asset.height}
        onReady={onVisualReady}
        onError={onVisualError}
        sx={mediaSx}
      />
    );
  }

  return (
    <InlineImageRenderer
      src={
        asset.mediaType === 'image' && displayUrl ? displayUrl : thumbnailUrl
      }
      alt={alt}
      objectFit={compact ? 'cover' : 'contain'}
      objectPosition={asset.mediaType === 'link' ? 'center' : 'top'}
      sizing={compact ? 'fill-frame' : 'natural'}
      intrinsicWidth={asset.width}
      intrinsicHeight={asset.height}
      onReady={onVisualReady}
      onError={onVisualError}
      sx={mediaSx}
    />
  );
}

type AssetRenderFrameProps = {
  asset: NormalizedAsset;
  alt: string;
  compact: boolean;
  surface?: InlineMediaSurface;
  loadingLabel?: string;
  frameSx: SystemStyleObject<Theme>;
  sx?: SxProps<Theme>;
  mediaSx?: SxProps<Theme>;
  onAssetRetry?: (() => void) | null;
  assetRetryBusy?: boolean;
  showAssetDiagnostics?: boolean;
};

const AssetRenderFrame = ({
  asset,
  alt,
  compact,
  surface,
  loadingLabel,
  frameSx,
  sx,
  mediaSx,
  onAssetRetry = null,
  assetRetryBusy = false,
  showAssetDiagnostics = false,
}: AssetRenderFrameProps) => {
  const resolvedSurface = surface ?? 'default';
  const loadReportedRef = useRef(false);
  const errorReportedRef = useRef(false);
  const fallbackReportedRef = useRef(false);
  const failedOverlayReportedRef = useRef(false);
  const inlinePresentation = getInlineMediaPresentation({
    asset,
    surface: resolvedSurface,
  });
  const { displayUrl, thumbnailUrl } = getRenderableAssetUrls(asset);
  const pending = ASSET_PROCESSING_PENDING_STATES.includes(
    asset.processingState,
  );
  const failed = asset.processingState === 'failed';
  const baseStatusInput = normalizedAssetToMediaStatusInput(asset);
  const processingStateInput =
    pending && baseStatusInput
      ? loadingLabel
        ? { ...baseStatusInput, message: loadingLabel }
        : baseStatusInput
      : null;
  const failedStateInput = failed && baseStatusInput ? baseStatusInput : null;
  const usingFallbackDerivatives = !asset.displayUrl && !asset.thumbnailUrl;
  const resolvedFrameSx = compact
    ? frameSx
    : {
        ...frameSx,
        minHeight:
          asset.mediaType === 'doc' || pending || failed
            ? inlinePresentation.placeholderMinHeight
            : 0,
      };
  const resolvedMediaSx = compact
    ? mediaSx
    : mergeSx(inlinePresentation.mediaSx, mediaSx);

  useEffect(() => {
    loadReportedRef.current = false;
    errorReportedRef.current = false;
    fallbackReportedRef.current = false;
    failedOverlayReportedRef.current = false;
  }, [
    asset.assetId,
    asset.displayUrl,
    asset.thumbnailUrl,
    asset.processingState,
    resolvedSurface,
  ]);

  useEffect(() => {
    if (!usingFallbackDerivatives || fallbackReportedRef.current) return;
    fallbackReportedRef.current = true;
    reportMediaTelemetryAsync({
      eventName: 'media_render_fallback_visible',
      stage: 'render',
      surface: resolvedSurface,
      assetId: asset.assetId,
      pipeline: 'asset_renderer',
      status: 'fallback',
      meta: {
        mediaType: asset.mediaType,
        processingState: asset.processingState,
        shape: inlinePresentation.shape,
        missingDisplayDerivative: !asset.displayUrl,
        missingThumbnailDerivative: !asset.thumbnailUrl,
      },
    });
  }, [
    asset.assetId,
    asset.displayUrl,
    asset.mediaType,
    asset.processingState,
    asset.thumbnailUrl,
    inlinePresentation.shape,
    resolvedSurface,
    usingFallbackDerivatives,
  ]);

  useEffect(() => {
    if (
      asset.processingState !== 'failed' ||
      failedOverlayReportedRef.current
    ) {
      return;
    }
    failedOverlayReportedRef.current = true;
    reportMediaTelemetryAsync({
      eventName: 'media_render_failed_state_visible',
      stage: 'render',
      surface: resolvedSurface,
      assetId: asset.assetId,
      pipeline: 'asset_renderer',
      status: 'failed',
      failureCode: 'asset_failed_state',
      failureReason: 'Asset entered a failed processing state before render.',
      meta: {
        mediaType: asset.mediaType,
        shape: inlinePresentation.shape,
      },
    });
  }, [
    asset.assetId,
    asset.mediaType,
    asset.processingState,
    inlinePresentation.shape,
    resolvedSurface,
  ]);

  const handleVisualReady = () => {
    if (loadReportedRef.current) return;
    loadReportedRef.current = true;
    reportMediaTelemetryAsync({
      eventName: 'media_render_ready',
      stage: 'render',
      surface: resolvedSurface,
      assetId: asset.assetId,
      pipeline: 'asset_renderer',
      status: 'ready',
      meta: {
        mediaType: asset.mediaType,
        processingState: asset.processingState,
        shape: inlinePresentation.shape,
        compact,
      },
    });
  };

  const handleVisualError = () => {
    if (errorReportedRef.current) return;
    errorReportedRef.current = true;
    reportMediaTelemetryAsync({
      eventName: 'media_render_failed',
      stage: 'render',
      surface: resolvedSurface,
      assetId: asset.assetId,
      pipeline: 'asset_renderer',
      status: 'failed',
      failureCode: 'media_render_failed',
      failureReason: 'The display derivative failed to render.',
      meta: {
        mediaType: asset.mediaType,
        processingState: asset.processingState,
        shape: inlinePresentation.shape,
        compact,
      },
    });
  };

  return (
    <Box sx={mergeSx(resolvedFrameSx, sx)}>
      {renderAssetVisual({
        asset,
        alt,
        compact,
        displayUrl,
        thumbnailUrl,
        mediaSx: resolvedMediaSx,
        onVisualReady: handleVisualReady,
        onVisualError: handleVisualError,
      })}

      {processingStateInput ? (
        <MediaPreviewStatusOverlay
          mode="processing"
          state={processingStateInput}
        />
      ) : null}
      {failedStateInput ? (
        <MediaPreviewStatusOverlay
          mode="failed"
          state={failedStateInput}
          onRetry={onAssetRetry}
          retryBusy={assetRetryBusy}
          showDiagnostics={showAssetDiagnostics}
        />
      ) : null}
    </Box>
  );
};

export const AssetInlinePreview = ({
  asset,
  alt,
  surface = 'default',
  loadingLabel,
  sx,
  mediaSx,
  onAssetRetry = null,
  assetRetryBusy = false,
  showAssetDiagnostics = false,
}: AssetInlinePreviewProps) => (
  <AssetRenderFrame
    asset={asset}
    alt={alt}
    compact={false}
    surface={surface}
    loadingLabel={loadingLabel}
    frameSx={INLINE_FRAME_BASE_SX}
    sx={sx}
    mediaSx={mediaSx}
    onAssetRetry={onAssetRetry}
    assetRetryBusy={assetRetryBusy}
    showAssetDiagnostics={showAssetDiagnostics}
  />
);

export const AssetAvatar = ({
  asset,
  alt,
  size = 'small',
  sx,
  component,
  to,
}: AssetAvatarProps) => {
  const src =
    asset && asset.mediaType === 'image'
      ? (asset.displayUrl ?? asset.thumbnailUrl ?? null)
      : null;

  return (
    <ProfileAvatar
      src={src}
      alt={alt}
      size={size}
      sx={sx}
      component={component}
      to={to}
    />
  );
};

export const AssetThumbnail = ({
  asset,
  alt,
  compact = false,
  loadingLabel,
  sx,
  mediaSx,
  onAssetRetry = null,
  assetRetryBusy = false,
  showAssetDiagnostics = false,
}: AssetThumbnailProps) => (
  <AssetRenderFrame
    asset={asset}
    alt={alt}
    compact={compact}
    loadingLabel={loadingLabel}
    frameSx={THUMBNAIL_FRAME_SX}
    sx={sx}
    mediaSx={mediaSx}
    onAssetRetry={onAssetRetry}
    assetRetryBusy={assetRetryBusy}
    showAssetDiagnostics={showAssetDiagnostics}
  />
);

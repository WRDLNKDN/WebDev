import { Box, LinearProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { MediaStatusInput } from '../../lib/media/mediaStatus';
import { MediaStatusBanner } from './MediaStatusBanner';

export const MEDIA_PREVIEW_STATUS_OVERLAY_TEST_ID =
  'media-preview-status-overlay';

export type MediaPreviewStatusOverlayProps = {
  state: MediaStatusInput;
  mode: 'processing' | 'failed';
  showDiagnostics?: boolean;
  onRetry?: (() => void) | null;
  retryBusy?: boolean;
  sx?: SxProps<Theme>;
};

/**
 * Shared treatment for in-frame media previews: deterministic progress bar while
 * derivatives prepare, and the same banner vocabulary as inline upload surfaces.
 */
export const MediaPreviewStatusOverlay = ({
  state,
  mode,
  showDiagnostics = false,
  onRetry = null,
  retryBusy = false,
  sx,
}: MediaPreviewStatusOverlayProps) => {
  let resolvedSx: SxProps<Theme>[] = [];
  if (Array.isArray(sx)) {
    resolvedSx = sx;
  } else if (sx) {
    resolvedSx = [sx];
  }
  const isProcessing = mode === 'processing';
  const retryHandler = mode === 'failed' ? onRetry : null;

  return (
    <Box
      data-testid={MEDIA_PREVIEW_STATUS_OVERLAY_TEST_ID}
      sx={[
        {
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          pointerEvents: 'none',
        },
        ...resolvedSx,
      ]}
    >
      {isProcessing ? (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: 0,
            bgcolor: 'rgba(255,255,255,0.08)',
            pointerEvents: 'none',
            '& .MuiLinearProgress-bar': { bgcolor: 'primary.light' },
          }}
        />
      ) : null}
      <Box sx={{ pointerEvents: 'auto', p: 1, width: 1 }}>
        <MediaStatusBanner
          state={state}
          compact
          showDiagnostics={showDiagnostics}
          onRetry={retryHandler}
          retryBusy={retryBusy}
        />
      </Box>
    </Box>
  );
};

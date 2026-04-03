import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import {
  describeMediaStatus,
  type MediaStatusInput,
} from '../../lib/media/mediaStatus';

type MediaStatusBannerProps = {
  state: MediaStatusInput | null;
  onRetry?: (() => void) | null;
  retryBusy?: boolean;
  showDiagnostics?: boolean;
  compact?: boolean;
  sx?: SxProps<Theme>;
};

function statusToneStyles(
  tone: ReturnType<typeof describeMediaStatus>['tone'],
  theme: Theme,
) {
  switch (tone) {
    case 'success':
      return {
        borderColor: alpha(theme.palette.success.main, 0.32),
        bgcolor: alpha(theme.palette.success.main, 0.1),
      };
    case 'error':
      return {
        borderColor: alpha(theme.palette.error.main, 0.34),
        bgcolor: alpha(theme.palette.error.main, 0.1),
      };
    default:
      return {
        borderColor: alpha(theme.palette.primary.main, 0.26),
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      };
  }
}

function statusToneIconColor(
  tone: ReturnType<typeof describeMediaStatus>['tone'],
  theme: Theme,
) {
  switch (tone) {
    case 'success':
      return theme.palette.success.light;
    case 'error':
      return theme.palette.error.light;
    default:
      return theme.palette.primary.light;
  }
}

const StatusIcon = ({
  state,
  compact,
}: {
  state: ReturnType<typeof describeMediaStatus>;
  compact: boolean;
}) => {
  if (state.showSpinner) {
    return (
      <CircularProgress
        size={compact ? 16 : 18}
        thickness={5}
        sx={{ color: 'inherit', flexShrink: 0, mt: compact ? 0.15 : 0.2 }}
      />
    );
  }

  if (state.tone === 'success') {
    return (
      <CheckCircleOutlineIcon
        sx={{ fontSize: compact ? 18 : 20, flexShrink: 0, mt: 0.1 }}
      />
    );
  }

  if (state.tone === 'error') {
    return (
      <ErrorOutlineIcon
        sx={{ fontSize: compact ? 18 : 20, flexShrink: 0, mt: 0.1 }}
      />
    );
  }

  return (
    <InfoOutlinedIcon
      sx={{ fontSize: compact ? 18 : 20, flexShrink: 0, mt: 0.1 }}
    />
  );
};

export const MediaStatusBanner = ({
  state,
  onRetry = null,
  retryBusy = false,
  showDiagnostics = false,
  compact = false,
  sx,
}: MediaStatusBannerProps) => {
  if (!state) return null;

  const presentation = describeMediaStatus(state);
  const resolvedSx = Array.isArray(sx) ? sx : sx ? [sx] : [];

  return (
    <Box
      role="status"
      aria-live={presentation.ariaLive}
      sx={[
        {
          border: '1px solid',
          borderRadius: compact ? 1.5 : 2,
          px: compact ? 1 : 1.25,
          py: compact ? 0.8 : 1,
        },
        (theme: Theme) => statusToneStyles(presentation.tone, theme),
        ...resolvedSx,
      ]}
    >
      <Stack
        direction="row"
        spacing={compact ? 0.85 : 1}
        alignItems="flex-start"
      >
        <Box
          sx={(theme) => ({
            color: statusToneIconColor(presentation.tone, theme),
            display: 'flex',
            alignItems: 'center',
          })}
        >
          <StatusIcon state={presentation} compact={compact} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontWeight: 700,
              color: 'text.primary',
              fontSize: compact ? '0.75rem' : '0.78rem',
            }}
          >
            {presentation.title}
          </Typography>
          {presentation.message ? (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.2,
                color: 'text.secondary',
                lineHeight: 1.45,
                fontSize: compact ? '0.72rem' : '0.76rem',
              }}
            >
              {presentation.message}
            </Typography>
          ) : null}
          {showDiagnostics && presentation.diagnosticsLabel ? (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.45,
                color: 'text.disabled',
                fontSize: compact ? '0.68rem' : '0.72rem',
                wordBreak: 'break-word',
              }}
            >
              {presentation.diagnosticsLabel}
            </Typography>
          ) : null}
        </Box>
        {presentation.stage === 'failed' &&
        presentation.retryable &&
        onRetry ? (
          <Button
            size="small"
            variant="text"
            disabled={retryBusy}
            onClick={onRetry}
            sx={{ flexShrink: 0, alignSelf: compact ? 'center' : 'flex-start' }}
          >
            {retryBusy ? 'Retrying…' : 'Retry'}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
};

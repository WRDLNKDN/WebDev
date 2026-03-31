import { Box, Button, CircularProgress, Typography } from '@mui/material';

export const ChatThreadLoadingArea = () => {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
};

type ChatThreadErrorBannerProps = {
  error: string | null;
  loading: boolean;
  variant: 'popup' | 'popover';
  onRetry?: () => void;
};

export const ChatThreadErrorBanner = ({
  error,
  loading,
  variant,
  onRetry,
}: ChatThreadErrorBannerProps) => {
  if (!error || loading) return null;
  const isPopover = variant === 'popover';
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: isPopover ? 2 : 3,
        textAlign: 'center',
        gap: isPopover ? 1.5 : 0,
      }}
    >
      <Typography
        color="error"
        variant={isPopover ? 'body2' : 'body1'}
        fontWeight={500}
      >
        {error}
      </Typography>
      <Typography
        variant={isPopover ? 'caption' : 'body2'}
        color="text.secondary"
        sx={isPopover ? undefined : { mt: 1 }}
      >
        {isPopover
          ? 'This conversation may have been removed.'
          : 'You may not have access to this conversation, or it may have been deleted.'}
      </Typography>
      {onRetry ? (
        <Button
          size="small"
          variant="outlined"
          onClick={onRetry}
          sx={{ mt: 0.5 }}
        >
          Try again
        </Button>
      ) : null}
    </Box>
  );
};

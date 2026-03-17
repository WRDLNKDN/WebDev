import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { GLASS_CARD } from '../../../theme/candyStyles';

type AuthCallbackStatusCardProps = {
  error: string | null;
  timedOut: boolean;
  copyStatus: string | null;
  onTryAgain: () => void;
  onBackHome: () => void;
  onCopyDebugInfo: () => void;
};

export const AuthCallbackStatusCard = ({
  error,
  timedOut,
  copyStatus,
  onTryAgain,
  onBackHome,
  onCopyDebugInfo,
}: AuthCallbackStatusCardProps) => {
  return (
    <Paper
      elevation={24}
      sx={{
        ...GLASS_CARD,
        p: 6,
        textAlign: 'center',
        zIndex: 1,
      }}
    >
      <Stack spacing={4} alignItems="center">
        <CircularProgress
          size={60}
          thickness={2}
          sx={{ color: 'primary.main', mb: 2 }}
        />

        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              letterSpacing: -1,
              mb: 1,
              color: 'white',
            }}
          >
            {error ? 'Sign-in problem' : 'Authorization in Progress'}
          </Typography>

          {error ? (
            <>
              <Alert
                severity="error"
                variant="filled"
                sx={{ mt: 2, borderRadius: 2, mb: 2 }}
              >
                {error}
              </Alert>
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                sx={{ mt: 1, flexWrap: 'wrap' }}
              >
                <Button variant="contained" onClick={onTryAgain}>
                  Try again
                </Button>
                <Button variant="outlined" onClick={onBackHome}>
                  Back home
                </Button>
                <Button variant="text" onClick={onCopyDebugInfo}>
                  Copy debug info
                </Button>
              </Stack>
              {copyStatus && (
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {copyStatus}
                </Typography>
              )}
            </>
          ) : (
            <Typography
              variant="body1"
              sx={{ opacity: 0.7, maxWidth: 300, mx: 'auto' }}
            >
              Connecting your account. Please wait.
            </Typography>
          )}
        </Box>

        {!error && !timedOut && (
          <Typography
            variant="caption"
            sx={{
              opacity: 0.4,
              letterSpacing: 0,
            }}
          >
            This should only take a moment.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

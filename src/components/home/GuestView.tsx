import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { OAuthProvider } from '../../lib/signInWithOAuth';

interface GuestViewProps {
  busy: boolean;
  onAuth: (provider: OAuthProvider) => Promise<void>;
  /** When true, only render sign-in buttons (for hero backdrop layout). */
  buttonsOnly?: boolean;
}

export const GuestView = ({
  busy,
  onAuth,
  buttonsOnly = false,
}: GuestViewProps) => {
  const buttons = (
    <Stack spacing={2} sx={{ pt: buttonsOnly ? 0 : 2 }}>
      {/* Primary: Google */}
      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={
          busy ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />
        }
        onClick={() => void onAuth('google')}
        disabled={busy}
        sx={{
          borderRadius: 20,
          height: 56,
          fontSize: '1.1rem',
          textTransform: 'none',
          borderColor: 'rgba(255,255,255,0.4)',
          color: 'white',
          bgcolor: 'rgba(255,255,255,0.02)',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'rgba(66, 165, 245, 0.08)',
          },
        }}
      >
        {busy ? 'Connecting...' : 'Continue with Google'}
      </Button>

      {/* Secondary: Microsoft */}
      <Button
        variant="text"
        size="large"
        fullWidth
        startIcon={<MicrosoftIcon />}
        onClick={() => void onAuth('azure')}
        disabled={busy}
        sx={{
          borderRadius: 20,
          height: 56,
          textTransform: 'none',
          color: 'text.secondary',
          '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' },
        }}
      >
        Sign in with Microsoft
      </Button>
    </Stack>
  );

  if (buttonsOnly) {
    return (
      <Stack spacing={4} sx={{ maxWidth: 420, mx: 'auto', width: '100%' }}>
        {buttons}
      </Stack>
    );
  }

  return (
    <Stack spacing={4} sx={{ maxWidth: 520, mx: { xs: 'auto', md: 0 } }}>
      <Box>
        <Typography
          variant="h1"
          sx={{
            color: 'text.primary',
            fontWeight: 200,
            lineHeight: 1.1,
            mb: 2,
            fontSize: { xs: '2.5rem', md: '3.75rem' },
          }}
        >
          Connection in motion.
        </Typography>
        <Typography
          variant="h5"
          sx={{ color: 'text.secondary', fontWeight: 400 }}
        >
          A professional network built on values. Powered by participation.
        </Typography>
      </Box>

      {/* Primary CTA: Join */}
      <Stack spacing={2} sx={{ pt: 2 }}>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={
            busy ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <GoogleIcon />
            )
          }
          onClick={() => void onAuth('google')}
          disabled={busy}
          sx={{
            borderRadius: 20,
            height: 56,
            fontSize: '1.1rem',
            textTransform: 'none',
            borderColor: 'rgba(255,255,255,0.4)',
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.02)',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'rgba(66, 165, 245, 0.08)',
            },
          }}
        >
          {busy ? 'Connecting...' : 'Continue with Google'}
        </Button>

        {/* Secondary: Microsoft */}
        <Button
          variant="text"
          size="large"
          fullWidth
          startIcon={<MicrosoftIcon />}
          onClick={() => void onAuth('azure')}
          disabled={busy}
          sx={{
            borderRadius: 20,
            height: 56,
            textTransform: 'none',
            color: 'text.secondary',
            '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          Sign in with Microsoft
        </Button>
        {/* Secondary CTA: Explore Feed */}
        <Button
          component={RouterLink}
          to="/feed"
          variant="text"
          size="large"
          fullWidth
          sx={{
            borderRadius: 20,
            textTransform: 'none',
            color: 'text.secondary',
            '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          Explore Feed
        </Button>
      </Stack>
    </Stack>
  );
};

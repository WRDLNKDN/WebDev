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
  /** When true, use high-contrast opaque styles for OAuth CTAs (hero). */
  highContrast?: boolean;
}

/**
 * Hero guest block: IF buttonsOnly → just Join (Google/Microsoft) + Explore Feed;
 * ELSE → "Connection in motion." + subtext + same buttons (centered).
 */
export const GuestView = ({
  busy,
  onAuth,
  buttonsOnly = false,
  highContrast = false,
}: GuestViewProps) => {
  const googleSx = highContrast
    ? {
        borderRadius: 20,
        height: 56,
        fontSize: '1.1rem',
        textTransform: 'none' as const,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
        color: '#fff',
        bgcolor: 'rgba(255,255,255,0.15)',
        '&:hover': {
          borderWidth: 2,
          borderColor: '#fff',
          bgcolor: 'rgba(255,255,255,0.25)',
        },
      }
    : {
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
      };

  const microsoftSx = highContrast
    ? {
        borderRadius: 20,
        height: 56,
        fontSize: '1rem',
        textTransform: 'none' as const,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.7)',
        color: '#fff',
        bgcolor: 'rgba(255,255,255,0.08)',
        '&:hover': {
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.9)',
          bgcolor: 'rgba(255,255,255,0.18)',
        },
      }
    : {
        borderRadius: 20,
        height: 56,
        fontSize: '1rem',
        textTransform: 'none',
        borderColor: 'rgba(255,255,255,0.35)',
        color: 'white',
        bgcolor: 'rgba(255,255,255,0.04)',
        '&:hover': {
          borderColor: 'rgba(255,255,255,0.6)',
          bgcolor: 'rgba(255,255,255,0.08)',
        },
      };

  const exploreSx = highContrast
    ? {
        borderRadius: 20,
        height: 56,
        fontSize: '1rem',
        textTransform: 'none' as const,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.6)',
        color: '#fff',
        bgcolor: 'rgba(255,255,255,0.05)',
        '&:hover': {
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.85)',
          bgcolor: 'rgba(255,255,255,0.12)',
        },
      }
    : {
        borderRadius: 20,
        height: 56,
        fontSize: '1rem',
        textTransform: 'none',
        borderColor: 'rgba(255,255,255,0.3)',
        color: 'rgba(255,255,255,0.9)',
        bgcolor: 'transparent',
        '&:hover': {
          borderColor: 'rgba(255,255,255,0.6)',
          bgcolor: 'rgba(255,255,255,0.06)',
        },
      };

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
        sx={googleSx}
      >
        {busy ? 'Connecting...' : 'Continue with Google'}
      </Button>

      {/* Secondary: Microsoft */}
      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<MicrosoftIcon />}
        onClick={() => void onAuth('azure')}
        disabled={busy}
        sx={microsoftSx}
      >
        Sign in with Microsoft
      </Button>
      {/* Explore Feed: clearly a button */}
      <Button
        component={RouterLink}
        to="/feed"
        variant="outlined"
        size="large"
        fullWidth
        sx={exploreSx}
      >
        Explore Feed
      </Button>
    </Stack>
  );

  if (buttonsOnly) {
    return (
      <Stack
        spacing={4}
        sx={{ maxWidth: 420, mx: 'auto', width: '100%', alignItems: 'stretch' }}
      >
        {buttons}
      </Stack>
    );
  }

  return (
    <Stack spacing={4} sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center' }}>
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
          Business, but weirder.
        </Typography>
        <Typography
          variant="h5"
          sx={{ color: 'text.secondary', fontWeight: 400 }}
        >
          A professional networking space where you don&apos;t have to pretend.
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
          For people who build, create, and think differently.
        </Typography>
      </Box>

      {/* Primary CTA: Join */}
      <Stack spacing={2} sx={{ pt: 2, alignItems: 'stretch' }}>
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
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<MicrosoftIcon />}
          onClick={() => void onAuth('azure')}
          disabled={busy}
          sx={{
            borderRadius: 20,
            height: 56,
            fontSize: '1rem',
            textTransform: 'none',
            borderColor: 'rgba(255,255,255,0.35)',
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.04)',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.6)',
              bgcolor: 'rgba(255,255,255,0.08)',
            },
          }}
        >
          Sign in with Microsoft
        </Button>
        {/* Explore Feed: clearly a button */}
        <Button
          component={RouterLink}
          to="/feed"
          variant="outlined"
          size="large"
          fullWidth
          sx={{
            borderRadius: 20,
            height: 56,
            fontSize: '1rem',
            textTransform: 'none',
            borderColor: 'rgba(255,255,255,0.3)',
            color: 'rgba(255,255,255,0.9)',
            bgcolor: 'transparent',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.6)',
              bgcolor: 'rgba(255,255,255,0.06)',
            },
          }}
        >
          Explore Feed
        </Button>
      </Stack>
    </Stack>
  );
};

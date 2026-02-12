import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Window'; // Using Window icon (standard MS logo shape)
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import type { OAuthProvider } from '../../lib/signInWithOAuth';

interface GuestViewProps {
  busy: boolean;
  onAuth: (provider: OAuthProvider) => Promise<void>;
}

export const GuestView = ({ busy, onAuth }: GuestViewProps) => {
  const theme = useTheme();

  return (
    <Stack
      spacing={5}
      sx={{
        maxWidth: 550,
        mx: { xs: 'auto', md: 0 },
        textAlign: { xs: 'center', md: 'left' },
      }}
    >
      <Box>
        <Typography
          variant="h1"
          sx={{
            color: 'text.primary',
            fontWeight: 800, // Thicker font for impact
            lineHeight: 1.1,
            mb: 2,
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            letterSpacing: '-0.02em',
          }}
        >
          Welcome to your <br />
          {/* Gradient Text Effect */}
          <Box
            component="span"
            sx={{
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, #ffffff 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800,
            }}
          >
            professional community
          </Box>
        </Typography>

        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            fontWeight: 400,
            maxWidth: '480px',
            lineHeight: 1.6,
            mx: { xs: 'auto', md: 0 },
          }}
        >
          Professional networking, but human.
          <br />
          Verified, authentic, and noise-free.
        </Typography>
      </Box>

      {/* AUTH CONTROL PANEL */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          bgcolor: 'rgba(255,255,255,0.03)', // Subtle glass background
          border: '1px solid rgba(255,255,255,0.1)', // System border
          borderRadius: 4,
          width: { xs: '100%', sm: 'fit-content' },
          alignSelf: { xs: 'center', md: 'flex-start' },
        }}
      >
        <Stack spacing={2} width={{ xs: '100%', sm: '320px' }}>
          {/* Primary: Google */}
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
              justifyContent: 'flex-start',
              pl: 3,
              borderRadius: 2, // Slightly more technical corner radius
              height: 56,
              fontSize: '1rem',
              textTransform: 'none',
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              bgcolor: 'transparent',
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            {busy ? 'Verifying...' : 'Continue with Google'}
          </Button>

          {/* Peer: Microsoft - Now matches Google's weight */}
          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<MicrosoftIcon />}
            onClick={() => void onAuth('azure')}
            disabled={busy}
            sx={{
              justifyContent: 'flex-start',
              pl: 3,
              borderRadius: 2,
              height: 56,
              fontSize: '1rem',
              textTransform: 'none',
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              bgcolor: 'transparent',
              '&:hover': {
                borderColor: '#00a4ef', // Microsoft Blue Hint
                bgcolor: 'rgba(0, 164, 239, 0.08)',
              },
            }}
          >
            Sign in with Microsoft
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
};

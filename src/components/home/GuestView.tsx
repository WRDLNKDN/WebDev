import { Box, Button, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

interface GuestViewProps {
  /** @deprecated OAuth removed; kept for backward compat, ignored */
  busy?: boolean;
  /** @deprecated OAuth removed; kept for backward compat, ignored */
  onAuth?: (provider: 'google' | 'azure') => Promise<void>;
  /** When true, only render buttons (for hero backdrop layout). */
  buttonsOnly?: boolean;
  /** When true, use high-contrast opaque styles for CTAs (hero). */
  highContrast?: boolean;
}

/**
 * Hero guest block: Join our Community (→ /join) + Explore Feed.
 * OAuth is done in the Join wizard, not on Home.
 */
export const GuestView = ({
  buttonsOnly = false,
  highContrast = false,
}: GuestViewProps) => {
  const navigate = useNavigate();
  const [joinLoading, setJoinLoading] = useState(false);
  const goToJoin = useCallback(async () => {
    setJoinLoading(true);
    try {
      await import('../../pages/auth/Join');
    } catch {
      // Continue to Join even if preload fails.
    } finally {
      navigate('/join');
    }
  }, [navigate]);

  const joinSx = highContrast
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

  // Hero (buttonsOnly): single primary CTA — OAuth selection happens on /join
  if (buttonsOnly) {
    return (
      <Stack
        spacing={4}
        sx={{ maxWidth: 420, mx: 'auto', width: '100%', alignItems: 'stretch' }}
      >
        <Button
          onClick={() => void goToJoin()}
          variant="outlined"
          size="large"
          fullWidth
          disabled={joinLoading}
          sx={joinSx}
        >
          {joinLoading ? 'Opening Join…' : 'Join Us'}
        </Button>
      </Stack>
    );
  }

  const buttons = (
    <Stack spacing={2} sx={{ pt: 2 }}>
      <Button
        onClick={() => void goToJoin()}
        variant="outlined"
        size="large"
        fullWidth
        disabled={joinLoading}
        sx={joinSx}
      >
        {joinLoading ? 'Opening Join…' : 'Join our Community'}
      </Button>
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
      {buttons}
    </Stack>
  );
};

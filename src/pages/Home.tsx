import {
  Alert,
  Box,
  Container,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { GuestView } from '../components/home/GuestView';
import { HomeSkeleton } from '../components/home/HomeSkeleton';
import { HomeVisual } from '../components/home/HomeVisual';
import { signInWithOAuth, type OAuthProvider } from '../lib/signInWithOAuth';
import { supabase } from '../lib/supabaseClient';

// --- HUMAN OS ERROR TRANSLATOR ---
const getFriendlyErrorMessage = (e: unknown) => {
  let msg = 'An unexpected error occurred.';
  if (e instanceof Error) msg = e.message;
  if (typeof e === 'string') msg = e;

  // Make common errors conversational
  const lower = msg.toLowerCase();

  if (lower.includes('popup closed') || lower.includes('closed by user')) {
    return 'Login canceled. It looks like the window was closed before we could finish.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return "We can't reach the verification server. Check your signal and try again.";
  }
  if (lower.includes('timeout')) {
    return "The connection timed out. Let's give it another shot.";
  }

  // Clean up technical jargon if we fall through
  return `We hit a snag: ${msg.replace('AuthApiError: ', '')}`;
};

export const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- AUTH & REDIRECT LOGIC ---
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (mounted) {
          if (error) console.warn('Session check warning:', error.message);

          if (data.session) {
            navigate('/directory', { replace: true });
            return;
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        if (mounted) setIsLoading(false);
      }
    };

    void checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        navigate('/directory', { replace: true });
      }
    });

    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) {
        setIsLoading(false);
      }
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, [navigate, isLoading]);

  const handleAuth = async (provider: OAuthProvider) => {
    setBusy(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        '/directory',
      )}`;

      const { data, error: signInError } = await signInWithOAuth(provider, {
        redirectTo,
      });

      if (signInError) throw signInError;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: unknown) {
      // Use the friendly translator here
      setError(getFriendlyErrorMessage(e));
      setBusy(false);
    }
  };

  // --- RENDER ---

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <>
      <Helmet>
        <title>WRDLNKDN | Welcome to your professional community</title>
        <meta
          name="description"
          content="The Human Operating System. A verified professional network built for authenticity."
        />
      </Helmet>

      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'center',
          bgcolor: '#05070f',
          backgroundImage:
            'radial-gradient(circle at 15% 50%, rgba(66, 165, 245, 0.08), transparent 25%), radial-gradient(circle at 85% 30%, rgba(236, 64, 122, 0.08), transparent 25%)',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          {/* Swapped Grid for Stack */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 6, md: 8 }}
            alignItems="center"
            justifyContent="space-between"
          >
            {/* --- LEFT COLUMN: Guest Gateway --- */}
            <Box sx={{ width: '100%', maxWidth: { md: '550px' } }}>
              {error && (
                <Alert
                  severity="error"
                  onClose={() => setError(null)}
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    // Slightly softer error styling
                    border: '1px solid rgba(244, 67, 54, 0.3)',
                    bgcolor: 'rgba(244, 67, 54, 0.05)',
                  }}
                >
                  {error}
                </Alert>
              )}

              <GuestView busy={busy} onAuth={handleAuth} />
            </Box>

            {/* --- RIGHT COLUMN: Brand Visual --- */}
            {/* Using Box flex to center the visual in its 'lane' */}
            {!isMobile && (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <HomeVisual />
              </Box>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

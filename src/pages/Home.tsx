import { Alert, Box, Container, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { GuestView } from '../components/home/GuestView';
import { HeroMotionVideo } from '../components/home/HeroMotionVideo';
import { HomeSkeleton } from '../components/home/HomeSkeleton';
import { signInWithOAuth, type OAuthProvider } from '../lib/signInWithOAuth';
import { supabase } from '../lib/supabaseClient';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

export const Home = () => {
  const navigate = useNavigate();

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
            navigate('/feed', { replace: true });
            return;
          }

          // No session? Stop loading and show Guest View
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        if (mounted) setIsLoading(false);
      }
    };

    void checkSession();

    // 2. Listen for realtime auth changes (e.g. login in another tab)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        navigate('/feed', { replace: true });
      }
    });

    // 3. Fail-safe timeout
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
        '/feed',
      )}`;

      const { data, error: signInError } = await signInWithOAuth(provider, {
        redirectTo,
      });

      if (signInError) throw signInError;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: unknown) {
      setError(toMessage(e));
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
        <title>WRDLNKDN | Business, But Weirder</title>
        <meta
          name="description"
          content="Showcase your professional identity. Build your weird community."
        />
      </Helmet>

      {/* Signed-out landing backdrop: grid, hero video (top-left), wordmark + tagline + sign-in (center) */}
      <Box
        component="main"
        sx={{
          position: 'relative',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          bgcolor: '#05070f',
          backgroundImage: 'url(/assets/grid-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Contrast overlay for legibility */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.4), rgba(0,0,0,0.75))',
            zIndex: 0,
          }}
        />

        {/* Hero motion: Greenling to Pinkling video, top-left */}
        <HeroMotionVideo />

        {/* Center: wordmark + tagline stack + sign-in */}
        <Container
          maxWidth="sm"
          sx={{ position: 'relative', zIndex: 2, py: 4 }}
          data-testid="signed-out-landing"
        >
          <Stack spacing={3} alignItems="center" textAlign="center">
            {error && (
              <Alert
                severity="error"
                onClose={() => setError(null)}
                sx={{ mb: 0, width: '100%' }}
              >
                {error}
              </Alert>
            )}

            {/* Primary wordmark */}
            <Typography
              component="h1"
              variant="h1"
              sx={{
                color: '#fff',
                fontWeight: 700,
                letterSpacing: '0.02em',
                fontSize: { xs: '3rem', sm: '3.5rem', md: '4rem' },
                lineHeight: 1.1,
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}
            >
              WRDLNKDN
            </Typography>

            {/* Tagline stack: pronunciation, Business But Weirder, long tagline */}
            <Stack spacing={0.5} sx={{ maxWidth: 420 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                }}
              >
                WEERD-LINK-DIN
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'primary.light',
                  fontWeight: 600,
                  fontStyle: 'italic',
                }}
              >
                Business, But Weirder
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 400,
                  lineHeight: 1.5,
                }}
              >
                Showcase your professional identity. Build your weird community.
              </Typography>
            </Stack>

            {/* Sign-in buttons (above fold, below tagline) */}
            <GuestView busy={busy} onAuth={handleAuth} buttonsOnly />
          </Stack>
        </Container>
      </Box>
    </>
  );
};

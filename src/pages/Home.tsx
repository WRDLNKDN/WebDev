import { Alert, Box, Container, Grid, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { GuestView } from '../components/home/GuestView';
import { HomeSkeleton } from '../components/home/HomeSkeleton';
import { HowItWorks } from '../components/home/HowItWorks';
import { SocialProof } from '../components/home/SocialProof';
import { WhatMakesDifferent } from '../components/home/WhatMakesDifferent';
import { toMessage } from '../lib/errors';
import { signInWithOAuth, type OAuthProvider } from '../lib/signInWithOAuth';
import { supabase } from '../lib/supabaseClient';

/**
 * Home: narrative landing (Hero, What Makes Different, How It Works, Social Proof).
 * IF user has session → redirect to /feed. ELSE show guest hero + CTAs.
 */
export const Home = () => {
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const [heroPhase, setHeroPhase] = useState<'playing' | 'dimmed'>(() =>
    prefersReducedMotion ? 'dimmed' : 'playing',
  );

  // AUTH: IF session exists → redirect to /feed. ELSE stop loading and show Hero (GuestView).
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

          setIsLoading(false);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        if (mounted) {
          setError(toMessage(err));
          setIsLoading(false);
        }
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
        <title>Business, but weirder. | WRDLNKDN</title>
        <meta
          name="description"
          content="A professional networking space where you don't have to pretend. For people who build, create, and think differently."
        />
        <link rel="canonical" href="https://wrdlnkdn.com" />
        <meta property="og:url" content="https://wrdlnkdn.com" />
        <meta property="og:title" content="Business, but weirder." />
        <meta
          property="og:description"
          content="A professional networking space where you don't have to pretend. For people who build, create, and think differently."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://wrdlnkdn.com/og-image.png" />
        <meta
          property="og:image:alt"
          content="WRDLNKDN – Business, but weirder."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Business, but weirder." />
        <meta
          name="twitter:description"
          content="A professional networking space where you don't have to pretend. For people who build, create, and think differently."
        />
        <meta
          name="twitter:image"
          content="https://wrdlnkdn.com/og-image.png"
        />
      </Helmet>

      {/* Hero: video background + value prop + CTAs */}
      <Box
        component="main"
        sx={{
          position: 'relative',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Hero video: play once, then fade to dim. Skip animation if prefers-reduced-motion. */}
        <Box
          component="video"
          autoPlay
          muted
          loop={false}
          playsInline
          onEnded={() => setHeroPhase('dimmed')}
          onError={(e) => {
            setHeroPhase('dimmed');
            const el = e.currentTarget;
            if (
              el.src?.includes('hero-green-pinky') &&
              !el.src.includes('hero-bg')
            ) {
              el.src = '/assets/video/hero-bg.mp4';
            }
          }}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: heroPhase === 'dimmed' && !prefersReducedMotion ? 0.15 : 1,
            transition:
              heroPhase === 'dimmed' && !prefersReducedMotion
                ? 'opacity 0.8s ease-out'
                : 'none',
          }}
          src="/assets/video/hero-green-pinky.mp4"
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor:
              heroPhase === 'dimmed'
                ? 'rgba(5, 7, 15, 0.92)'
                : 'rgba(5, 7, 15, 0.6)',
            zIndex: 1,
            pointerEvents: 'none',
            transition: 'background-color 0.8s ease-out',
          }}
        />
        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            zIndex: 2,
            opacity: heroPhase === 'dimmed' ? 1 : 0,
            transition: 'opacity 0.6s ease-in 0.3s',
          }}
          data-testid="signed-out-landing"
        >
          <Grid
            container
            spacing={8}
            alignItems="center"
            justifyContent="center"
            sx={{ textAlign: 'center' }}
          >
            <Grid
              size={{ xs: 12 }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {error && (
                <Alert
                  severity="error"
                  onClose={() => setError(null)}
                  sx={{ mb: 2 }}
                >
                  {error}
                </Alert>
              )}
              <GuestView busy={busy} onAuth={handleAuth} />
            </Grid>

            <Grid
              size={{ xs: 12 }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
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

              {/* Tagline stack: pronunciation, Business but weirder, long tagline */}
              <Stack spacing={0.5} sx={{ maxWidth: 420, alignItems: 'center' }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    letterSpacing: '0.12em',
                    fontSize: '0.75rem',
                  }}
                >
                  (Weird Link-uh-din)
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    color: 'primary.light',
                    fontWeight: 600,
                  }}
                >
                  Business, but weirder
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  Showcase your professional identity. Build your weird
                  community.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* What Makes This Different */}
      <WhatMakesDifferent />

      {/* How It Works */}
      <HowItWorks />

      {/* Social Proof */}
      <SocialProof />
    </>
  );
};

import { Alert, Box, Container, Grid, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { GuestView } from '../components/home/GuestView';
import { HowItWorks } from '../components/home/HowItWorks';
import { SocialProof } from '../components/home/SocialProof';
import { WhatMakesDifferent } from '../components/home/WhatMakesDifferent';
import { toMessage } from '../lib/errors';
import { signInWithOAuth, type OAuthProvider } from '../lib/signInWithOAuth';
import { supabase } from '../lib/supabaseClient';

export const Home = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Auth check — runs once, never remounts video
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          navigate('/feed', { replace: true });
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };

    void checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) navigate('/feed', { replace: true });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // Video setup — runs once after mount
  useEffect(() => {
    if (prefersReducedMotion) {
      setShowContent(true);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setShowContent(true);
      return;
    }

    const onEnded = () => setShowContent(true);
    const onError = () => setShowContent(true);

    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    // Attempt play
    video.play().catch(() => setShowContent(true));

    return () => {
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [prefersReducedMotion]);

  const handleAuth = async (provider: OAuthProvider) => {
    setBusy(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/feed')}`;
      const { data, error: signInError } = await signInWithOAuth(provider, {
        redirectTo,
      });
      if (signInError) throw signInError;
      if (data?.url) window.location.href = data.url;
    } catch (e: unknown) {
      setError(toMessage(e));
      setBusy(false);
    }
  };

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

      <Box
        component="main"
        sx={{
          position: 'relative',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          bgcolor: '#000',
        }}
      >
        {/* Video — plain native element, ref-controlled, never conditionally rendered */}
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none',
            display: showContent ? 'none' : 'block',
          }}
        >
          <source src="/assets/video/hero-bg.mp4" type="video/mp4" />
        </video>

        {/* Dark bg — shown once video ends */}
        {showContent && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(5, 7, 15, 0.92)',
              zIndex: 1,
            }}
          />
        )}

        {/* Content — fades in after video ends */}
        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            zIndex: 2,
            opacity: showContent ? 1 : 0,
            pointerEvents: showContent ? 'auto' : 'none',
            transition: showContent ? 'opacity 0.9s ease-in' : 'none',
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
              <GuestView busy={busy} onAuth={handleAuth} buttonsOnly />
            </Grid>

            <Grid
              size={{ xs: 12 }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
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
                  sx={{ color: 'primary.light', fontWeight: 600 }}
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
                  A professional networking space where you don&apos;t have to
                  pretend.
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  For people who build, create, and think differently.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <WhatMakesDifferent />
      <HowItWorks />
      <SocialProof />
    </>
  );
};

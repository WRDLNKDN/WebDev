// src/pages/Home.tsx
import { Alert, Box, Container, Grid, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { GuestView } from '../../components/home/GuestView';
import { HomeSkeleton } from '../../components/home/HomeSkeleton';
import { HowItWorks } from '../../components/home/HowItWorks';
import { SocialProof } from '../../components/home/SocialProof';
import { WhatMakesDifferent } from '../../components/home/WhatMakesDifferent';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';

/**
 * Home: narrative landing (Hero, What Makes Different, How It Works, Social Proof).
 * If user has session, redirect to /feed. Else show guest hero and CTAs.
 */
export const Home = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const PRIMARY_VIDEO_SRC = '/assets/video/hero-green-pinky.mp4';
  const FALLBACK_VIDEO_SRC = '/assets/video/hero-bg.mp4';

  const [videoSrc, setVideoSrc] = useState(PRIMARY_VIDEO_SRC);

  // Show text only after the video finishes (or immediately if reduced motion).
  const [showContent, setShowContent] = useState<boolean>(
    prefersReducedMotion ? true : false,
  );

  const [heroPhase, setHeroPhase] = useState<'playing' | 'dimmed'>(() =>
    prefersReducedMotion ? 'dimmed' : 'playing',
  );

  // AUTH: if session exists, redirect to /feed. Else stop loading and show Hero.
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError)
          console.warn('Session check warning:', sessionError.message);

        if (data.session) {
          navigate('/feed', { replace: true });
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Session check failed:', err);
        if (mounted) {
          setError(toMessage(err));
          setIsLoading(false);
        }
      }
    };

    void checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        navigate('/feed', { replace: true });
      }
    });

    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) setIsLoading(false);
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, [navigate, isLoading]);

  const handleVideoEnded = () => {
    if (!prefersReducedMotion) setHeroPhase('dimmed');
    setShowContent(true);
  };

  // 1.35x playback reduces time-to-dialog; respect prefers-reduced-motion
  const setPlaybackRate = useCallback(() => {
    const el = videoRef.current;
    if (el && !prefersReducedMotion) {
      el.playbackRate = 1.35;
    }
  }, [prefersReducedMotion]);

  const handleVideoError = () => {
    // IMPORTANT:
    // Do NOT show the content on error.
    // Swap to fallback video and still wait for onEnded.
    if (videoSrc !== FALLBACK_VIDEO_SRC) {
      setVideoSrc(FALLBACK_VIDEO_SRC);

      // Try to restart playback with the new source.
      requestAnimationFrame(() => {
        const el = videoRef.current;
        if (!el) return;
        try {
          el.load();
          void el.play();
        } catch {
          // If play fails, we still do not reveal content yet.
          // Let the user see the background overlay and the page will remain usable.
        }
      });

      return;
    }

    // If even the fallback video errors, reveal content so the page is not stuck.
    setHeroPhase('dimmed');
    setShowContent(true);
  };

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
          content="WRDLNKDN - Business, but weirder."
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
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          muted
          loop={false}
          playsInline
          onLoadedMetadata={setPlaybackRate}
          onCanPlay={setPlaybackRate}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
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
                ? 'opacity 1s ease-out'
                : 'none',
          }}
          src={videoSrc}
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
            transition: 'background-color 1s ease-out',
          }}
        />

        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            zIndex: 2,
            opacity: showContent ? 1 : 0,
            transition: showContent ? 'opacity 250ms ease-in' : 'none',
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
              <GuestView buttonsOnly />
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

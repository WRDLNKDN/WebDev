import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [contentVisible, setContentVisible] = useState(prefersReducedMotion);
  const VOLUME = 0.5; // Lower volume (0–1) for the voiceover
  const voiceoverRef = useRef<HTMLVideoElement | null>(null);
  const voiceoverStartedRef = useRef(false);
  const [voiceoverBlocked, setVoiceoverBlocked] = useState(false);
  const [voiceoverPlaying, setVoiceoverPlaying] = useState(false);

  const handleVoiceoverCanPlayThrough = useCallback(() => {
    const video = voiceoverRef.current;
    if (!video || prefersReducedMotion || voiceoverStartedRef.current) return;
    voiceoverStartedRef.current = true;
    // Start muted (autoplay allowed), then unmute once playing so audio autoplays
    video.muted = true;
    video.volume = VOLUME;
    video
      .play()
      .then(() => {
        video.muted = false;
      })
      .catch(() => setVoiceoverBlocked(true));
  }, [prefersReducedMotion]);

  const playVoiceover = useCallback(() => {
    const video = voiceoverRef.current;
    if (!video || prefersReducedMotion) return;
    setVoiceoverBlocked(false);
    voiceoverStartedRef.current = true;
    video.volume = VOLUME;
    video.currentTime = 0;
    video.play().catch(() => setVoiceoverBlocked(true));
  }, [prefersReducedMotion]);

  const stopVoiceover = useCallback(() => {
    const video = voiceoverRef.current;
    if (!video) return;
    video.pause();
    setVoiceoverPlaying(false);
  }, []);

  // Hero content: with reduced motion, show immediately. Else fade in after background dims.
  useEffect(() => {
    if (prefersReducedMotion && heroPhase === 'dimmed') {
      setContentVisible(true);
      return;
    }
    if (heroPhase !== 'dimmed') return;
    const id = setTimeout(() => setContentVisible(true), 600);
    return () => clearTimeout(id);
  }, [heroPhase, prefersReducedMotion]);

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
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Static dim background when prefers-reduced-motion (no animation) */}
        {prefersReducedMotion && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background:
                'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(20,30,50,0.4) 0%, rgba(5,7,15,1) 100%)',
            }}
          />
        )}
        {/* Hero video: play once, then fade to dim. Skip entirely if prefers-reduced-motion. */}
        {!prefersReducedMotion && (
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
              opacity: heroPhase === 'dimmed' ? 0.12 : 1,
              transition:
                heroPhase === 'dimmed' ? 'opacity 1s ease-out' : 'none',
            }}
            src="/assets/video/hero-green-pinky.mp4"
          />
        )}
        {/* Voiceover: "Business, but weirder." Plays once when ready. Hidden; audio only. Skips if prefers-reduced-motion. */}
        {!prefersReducedMotion && (
          <Box
            component="video"
            ref={voiceoverRef}
            src="/assets/video/concept-bumper.mp4"
            preload="auto"
            muted
            loop={false}
            playsInline
            onCanPlayThrough={handleVoiceoverCanPlayThrough}
            onPlay={() => setVoiceoverPlaying(true)}
            onEnded={() => setVoiceoverPlaying(false)}
            onPause={() => setVoiceoverPlaying(false)}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              pointerEvents: 'none',
              zIndex: 0,
              objectFit: 'cover',
            }}
            aria-hidden
          />
        )}
        {/* Overlay: lighter during animation, darker when dimmed. For reduced-motion, always dim. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor:
              heroPhase === 'dimmed' || prefersReducedMotion
                ? 'rgba(5, 7, 15, 0.94)'
                : 'rgba(5, 7, 15, 0.55)',
            zIndex: 1,
            pointerEvents: 'none',
            transition: 'background-color 1s ease-out',
          }}
        />
        <Container
          maxWidth="lg"
          aria-hidden={!contentVisible}
          sx={{
            position: 'relative',
            zIndex: 2,
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            opacity: contentVisible ? 1 : 0,
            transition: 'opacity 0.8s ease-in',
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
            {/* Hero text first: primary focal point */}
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
              {voiceoverPlaying && !prefersReducedMotion && (
                <Button
                  onClick={stopVoiceover}
                  size="small"
                  sx={{
                    mt: 1.5,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    '&:hover': { color: 'primary.light' },
                  }}
                >
                  Stop
                </Button>
              )}
              {voiceoverBlocked && !prefersReducedMotion && (
                <Button
                  onClick={playVoiceover}
                  size="small"
                  sx={{
                    mt: 1.5,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    '&:hover': { color: 'primary.light' },
                  }}
                >
                  Play with sound
                </Button>
              )}
            </Grid>

            {/* OAuth CTAs: highest contrast, fully opaque */}
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
              <GuestView
                busy={busy}
                onAuth={handleAuth}
                buttonsOnly
                highContrast
              />
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

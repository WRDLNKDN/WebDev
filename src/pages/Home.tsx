import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Stack,
  Tooltip,
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
import { isProfileOnboarded } from '../lib/profileOnboarding';
import { signInWithOAuth, type OAuthProvider } from '../lib/signInWithOAuth';
import { supabase } from '../lib/supabaseClient';

/**
 * Home: narrative landing (Hero, What Makes Different, How It Works, Social Proof).
 * Sequence:
 *  1. Hero video plays fully — no content visible, no sound
 *  2. Video ends → content fades in + sound plays automatically
 *  3. User can mute/unmute at any time once sound has started
 *  4. If autoplay is blocked, "Play with sound" button is shown
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

  // 'video' = hero video is playing, content is hidden
  // 'content' = video ended, content fades in + sound starts
  const [phase, setPhase] = useState<'video' | 'content'>(() =>
    prefersReducedMotion ? 'content' : 'video',
  );

  const VOLUME = 0.5;
  const voiceoverRef = useRef<HTMLVideoElement | null>(null);
  const voiceoverStartedRef = useRef(false);

  const [soundBlocked, setSoundBlocked] = useState(false);
  const [soundStarted, setSoundStarted] = useState(false); // true while audio is actively playing
  const [soundMuted, setSoundMuted] = useState(false);

  // Video ends → transition to content phase
  const handleVideoEnded = useCallback(() => {
    setPhase('content');
  }, []);

  // When phase becomes 'content', auto-play the voiceover
  useEffect(() => {
    if (phase !== 'content' || prefersReducedMotion) return;
    const video = voiceoverRef.current;
    if (!video || voiceoverStartedRef.current) return;

    voiceoverStartedRef.current = true;

    // Start muted (browsers allow this), then unmute once playing
    video.muted = true;
    video.volume = VOLUME;

    video
      .play()
      .then(() => {
        // Now that it's playing, unmute to get audio
        video.muted = false;
        setSoundStarted(true);
        setSoundBlocked(false);
      })
      .catch(() => {
        // Autoplay fully blocked — show manual button
        setSoundBlocked(true);
      });
  }, [phase, prefersReducedMotion]);

  const playSound = useCallback(() => {
    const video = voiceoverRef.current;
    if (!video) return;
    setSoundBlocked(false);
    video.volume = VOLUME;
    video.muted = false;
    video.currentTime = 0;
    video
      .play()
      .then(() => {
        setSoundStarted(true);
        setSoundMuted(false);
        setSoundBlocked(false);
      })
      .catch(() => setSoundBlocked(true));
  }, []);

  const toggleMute = useCallback(() => {
    const video = voiceoverRef.current;
    if (!video) return;
    if (soundMuted) {
      video.muted = false;
      video.volume = VOLUME;
      setSoundMuted(false);
    } else {
      video.muted = true;
      setSoundMuted(true);
    }
  }, [soundMuted]);

  // Auth check — redirect if already signed in
  useEffect(() => {
    let mounted = true;

    const checkSessionAndProfile = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (mounted) {
          if (error) console.warn('Session check warning:', error.message);
          if (data.session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select(
                'display_name, join_reason, participation_style, policy_version',
              )
              .eq('id', data.session.user.id)
              .maybeSingle();

            if (mounted) {
              if (isProfileOnboarded(profile)) {
                navigate('/feed', { replace: true });
              } else {
                navigate('/join', { replace: true });
              }
            }
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

    void checkSessionAndProfile();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) void checkSessionAndProfile();
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

  if (isLoading) return <HomeSkeleton />;

  const contentVisible = phase === 'content' || prefersReducedMotion;

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
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Reduced motion: static background only */}
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

        {/* Hero video — muted, plays once at full opacity, then fades */}
        {!prefersReducedMotion && (
          <Box
            component="video"
            autoPlay
            muted
            loop={false}
            playsInline
            onEnded={handleVideoEnded}
            onError={(e) => {
              handleVideoEnded();
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
              opacity: phase === 'video' ? 1 : 0.12,
              transition:
                phase === 'content' ? 'opacity 1.2s ease-out' : 'none',
            }}
            src="/assets/video/hero-green-pinky.mp4"
          />
        )}

        {/* Voiceover audio — invisible, triggered after video ends */}
        {!prefersReducedMotion && (
          <Box
            component="video"
            ref={voiceoverRef}
            src="/assets/video/concept-bumper.mp4"
            preload="auto"
            loop={false}
            playsInline
            onEnded={() => setSoundStarted(false)}
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
              zIndex: -1,
            }}
            aria-hidden
          />
        )}

        {/* Overlay: transparent during video, dark after */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            bgcolor:
              phase === 'video'
                ? 'rgba(5, 7, 15, 0)'
                : prefersReducedMotion
                  ? 'rgba(5, 7, 15, 0.94)'
                  : 'rgba(5, 7, 15, 0.88)',
            transition: 'background-color 1.2s ease-out',
          }}
        />

        {/* Content — invisible during video, fades in after */}
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
            pointerEvents: contentVisible ? 'auto' : 'none',
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
            {/* Hero text */}
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

              {/* Mute / Unmute toggle — only shown while sound is actively playing */}
              {!prefersReducedMotion && soundStarted && (
                <Tooltip title={soundMuted ? 'Unmute audio' : 'Mute audio'}>
                  <IconButton
                    onClick={toggleMute}
                    size="small"
                    aria-label={soundMuted ? 'Unmute audio' : 'Mute audio'}
                    sx={{
                      mt: 2,
                      color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.75,
                      gap: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                    }}
                  >
                    {soundMuted ? (
                      <VolumeOffIcon fontSize="small" />
                    ) : (
                      <VolumeUpIcon fontSize="small" />
                    )}
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {soundMuted ? 'Unmute' : 'Mute'}
                    </Typography>
                  </IconButton>
                </Tooltip>
              )}

              {/* Autoplay blocked — manual play button */}
              {!prefersReducedMotion && soundBlocked && (
                <Button
                  onClick={playSound}
                  size="small"
                  startIcon={<VolumeUpIcon fontSize="small" />}
                  sx={{
                    mt: 2,
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 2,
                    px: 2,
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    '&:hover': {
                      color: 'primary.light',
                      borderColor: 'primary.light',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  Play with sound
                </Button>
              )}
            </Grid>

            {/* OAuth CTAs */}
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

      <WhatMakesDifferent />
      <HowItWorks />
      <SocialProof />
    </>
  );
};

import {
  Alert,
  Box,
  Container,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { GuestView } from '../components/home/GuestView';
import { HomeSkeleton } from '../components/home/HomeSkeleton';
import { HomeVisual } from '../components/home/HomeVisual';
import { HowItWorks } from '../components/home/HowItWorks';
import { SocialProof } from '../components/home/SocialProof';
import { WhatMakesDifferent } from '../components/home/WhatMakesDifferent';
import { signInWithOAuth, type OAuthProvider } from '../lib/signInWithOAuth';
import { supabase } from '../lib/supabaseClient';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
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
        <title>WRDLNKDN | Connection in motion</title>
        <meta
          name="description"
          content="A professional network built on values. Powered by participation."
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
        {/* Video background (place hero-bg.mp4 in public/assets/video/) */}
        <Box
          component="video"
          autoPlay
          muted
          loop
          playsInline
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
          src="/assets/video/hero-bg.mp4"
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(5, 7, 15, 0.6)',
            zIndex: 1,
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={8} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
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
            {!isMobile && (
              <Grid size={{ xs: 0, md: 6 }}>
                <HomeVisual />
              </Grid>
            )}
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

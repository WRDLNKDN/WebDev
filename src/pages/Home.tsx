import {
  Alert,
  Box,
  Container,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { GuestView } from '../components/home/GuestView';
import { HomeSkeleton } from '../components/home/HomeSkeleton';
import { HomeVisual } from '../components/home/HomeVisual';
import { UserView } from '../components/home/UserView';
import { signInWithOAuth, type OAuthProvider } from '../lib/signInWithOAuth';
import { supabase } from '../lib/supabaseClient';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

export const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. AUTH & SESSION LOGIC ---
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (mounted) {
          if (error) console.warn('Session check warning:', error.message);
          setSession(data.session);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void initSession();

    // FAIL-SAFE: If Supabase hangs, kill the spinner after 1.5s
    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Supabase took too long. Forcing guest view.');
        setIsLoading(false);
      }
    }, 1500);

    // REAL-TIME LISTENER
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setIsLoading(false); // Ensure we stop loading on change
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [isLoading]); // Run once on mount

  // --- ADMIN CHECK ---
  useEffect(() => {
    if (!session) return;

    let mounted = true;
    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (mounted && !error && data) {
          setIsAdmin(true);
        }
      } catch {
        // ignore
      }
    };
    void checkAdmin();
    return () => {
      mounted = false;
    };
  }, [session]);

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
      setError(toMessage(e));
      setBusy(false);
    }
  };

  // --- 2. RENDER ---

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
          <Grid container spacing={8} alignItems="center">
            {/* --- LEFT COLUMN: Dynamic Content --- */}
            <Grid size={{ xs: 12, md: 6 }}>
              {!session && error && (
                <Alert
                  severity="error"
                  onClose={() => setError(null)}
                  sx={{ mb: 2 }}
                >
                  {error}
                </Alert>
              )}

              {!session ? (
                <GuestView busy={busy} onAuth={handleAuth} />
              ) : (
                <UserView isAdmin={isAdmin} />
              )}
            </Grid>

            {/* --- RIGHT COLUMN: Static Visual --- */}
            {!isMobile && (
              <Grid size={{ md: 6 }}>
                <HomeVisual />
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>
    </>
  );
};

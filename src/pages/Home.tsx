import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getContrastColor } from '../utils/contrast';

// 1. High-Fidelity Assets & Constants
const SYNERGY_BG = 'url("/assets/background.svg")';

// 2. Define the Card Colors
const HERO_CARD_BG = 'rgba(30, 30, 30, 0.85)';
const GRID_CARD_BG = 'rgba(255, 255, 255, 0.05)';

// 3. Calculate Contrast Dynamically
const HERO_TEXT_COLOR = getContrastColor(HERO_CARD_BG);
const GRID_TEXT_COLOR = getContrastColor('#1a1a1a');

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

export const Home = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!cancelled) {
        if (sessionError) setError(toMessage(sessionError));
        setSession(data.session ?? null);
      }
    };
    void init();
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt, newSession) => {
        setSession(newSession);
      },
    );
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (signInError) throw signInError;
    } catch (e: unknown) {
      setError(toMessage(e));
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: outError } = await supabase.auth.signOut();
      if (outError) throw outError;
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* HEADER LANDMARK */}
      <AppBar
        component="header"
        position="static"
        color="transparent"
        elevation={0}
        sx={{ bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 'bold',
              letterSpacing: 1,
              color: 'white',
            }}
          >
            WRDLNKDN
          </Typography>

          <Stack direction="row" spacing={2}>
            {!session ? (
              <Button
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => void signInGoogle()}
                disabled={busy}
              >
                {busy ? (
                  <CircularProgress
                    size={24}
                    color="inherit"
                    aria-label="Signing in..."
                  />
                ) : (
                  'Sign In'
                )}
              </Button>
            ) : (
              <>
                <Button
                  component={RouterLink}
                  to="/admin"
                  sx={{ color: 'white' }}
                >
                  Admin Console
                </Button>
                <Button
                  sx={{ color: 'white' }}
                  onClick={() => void signOut()}
                  disabled={busy}
                >
                  Sign Out
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* MAIN LANDMARK */}
      <Box
        component="main"
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', py: 8 }}>
          <Container maxWidth="md">
            <Paper
              elevation={24}
              sx={{
                p: { xs: 4, md: 6 },
                borderRadius: 4,
                bgcolor: HERO_CARD_BG,
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
              }}
            >
              <Stack spacing={4} alignItems="center">
                <Box>
                  {/* 1. BRAND UPDATE: WRDLNKDN */}
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                      fontWeight: 900,
                      mb: 0.5,
                      color: HERO_TEXT_COLOR,
                      letterSpacing: 2,
                    }}
                  >
                    WRDLNKDN
                  </Typography>

                  {/* 2. Phonetic Guide */}
                  <Typography
                    variant="h5"
                    component="p"
                    sx={{
                      mb: 3,
                      fontWeight: 400,
                      opacity: 0.6,
                      color: HERO_TEXT_COLOR,
                    }}
                  >
                    (Weird Link-uh-din)
                  </Typography>

                  {/* 3. DYNAMIC WELCOME */}
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      opacity: 0.9,
                      fontWeight: 300,
                      color: HERO_TEXT_COLOR,
                    }}
                  >
                    {!session ? (
                      <>
                        Professional networking, but{' '}
                        <Box
                          component="span"
                          sx={{ color: 'primary.main', fontWeight: 'bold' }}
                        >
                          human
                        </Box>
                        .
                      </>
                    ) : (
                      <>
                        Welcome back,{' '}
                        <Box
                          component="span"
                          sx={{ color: 'primary.main', fontWeight: 'bold' }}
                        >
                          Verified Generalist
                        </Box>
                        .
                      </>
                    )}
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {error}
                  </Alert>
                )}

                <Button
                  component={RouterLink}
                  to={session ? '/dashboard' : '/directory'}
                  variant="contained"
                  size="large"
                  sx={{
                    px: 6,
                    py: 1.5,
                    fontSize: '1.2rem',
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                >
                  {session ? 'Enter Your Dashboard' : 'Explore The Guild'}
                </Button>

                <Typography
                  variant="caption"
                  sx={{ opacity: 0.5, color: HERO_TEXT_COLOR }}
                >
                  {session
                    ? 'Your portfolio is your professional body of work.'
                    : 'Join the Guild of the Verified Generalists.'}
                </Typography>
              </Stack>
            </Paper>
          </Container>
        </Box>

        {/* MISSION GRID: High-Performance CSS Grid Layout */}
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.9)', py: 8 }}>
          <Container maxWidth="lg">
            {/* SYSTEM UPGRADE: Replaced Grid component with CSS Grid Stack.
              - Mobile: 1fr (Full width)
              - Desktop: repeat(3, 1fr) (Equal columns)
              - Gap: 4 (32px)
            */}
            <Stack
              component="section"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 4,
              }}
            >
              {/* Column 1: Our Vision */}
              <Paper sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }}>
                <Stack spacing={2}>
                  <Typography variant="h6" component="h3" color="primary.light">
                    Our Vision
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.7, color: GRID_TEXT_COLOR }}
                  >
                    We envision a world where professional and technical
                    communities are open, inclusive, and built around people
                    rather than hierarchy or gatekeeping.
                  </Typography>
                </Stack>
              </Paper>

              {/* Column 2: Our Team */}
              <Paper sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }}>
                <Stack spacing={2}>
                  <Typography variant="h6" component="h3" color="primary.light">
                    Our Team
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.7, color: GRID_TEXT_COLOR }}
                  >
                    We are a fully volunteer, open-source software community
                    working together through collaboration and shared effort.
                  </Typography>
                </Stack>
              </Paper>

              {/* Column 3: Our Pride */}
              <Paper sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }}>
                <Stack spacing={2}>
                  <Typography variant="h6" component="h3" color="primary.light">
                    Our Pride
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.7, color: GRID_TEXT_COLOR }}
                  >
                    WRDLNKDN is shaped by people who choose authenticity over
                    conformity and collaboration over competition.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Container>
        </Box>
      </Box>

      {/* FOOTER LANDMARK */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          bgcolor: 'black',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="body2"
            sx={{ color: 'grey.500', textAlign: 'center' }}
          >
            {'© '}
            {new Date().getFullYear()}
            {' WRDLNKDN. Built by Humans.'}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

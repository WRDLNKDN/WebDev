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

// --- ASSETS & CONSTANTS ---
const SYNERGY_BG = 'url("/assets/background.svg")';
const HERO_CARD_BG = 'rgba(30, 30, 30, 0.85)';
const GRID_CARD_BG = 'rgba(255, 255, 255, 0.05)';
const HERO_TEXT_COLOR = getContrastColor(HERO_CARD_BG);
const GRID_TEXT_COLOR = getContrastColor('#1a1a1a');

// --- WILSON COMPONENT (The Rotating Cast) ---
const WeirdlingWilson = () => {
  const [index, setIndex] = useState(1);
  const totalWeirdlings = 24; // Assuming assets/weirdling_1.png through 24.png exist

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev % totalWeirdlings) + 1);
    }, 7000); // 7-second "Activation Energy" interval
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      component="img"
      src={`/assets/weirdling_${index}.png`}
      alt=""
      sx={{
        position: 'absolute',
        bottom: '-15px', // Peeking over the edge
        left: '8%',
        height: '100px',
        zIndex: -1, // Sits behind the glass header
        pointerEvents: 'none',
        transition: 'all 0.5s ease-in-out',
        filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.7))',
      }}
    />
  );
};

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

export const Home = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 1. Session Init & Auth Listener
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) setError(toMessage(sessionError));
      setSession(data.session ?? null);
    };
    void init();
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt, newSession) => {
        if (!cancelled) setSession(newSession ?? null);
      },
    );
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2. Admin System Audit
  useEffect(() => {
    let cancelled = false;
    const checkAdmin = async () => {
      if (!session) {
        setIsAdmin(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (cancelled) return;
        setIsAdmin(error ? false : Boolean(data));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };
    void checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signInGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`;
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
    setError(null);
    setBusy(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('sb-wrdlnkdn-auth');
      setSession(null);
      window.location.assign('/');
    } catch (e: unknown) {
      setError(toMessage(e));
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
      }}
    >
      {/* HEADER LANDMARK */}
      <AppBar
        component="header"
        position="relative"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          overflow: 'visible', // Allows Wilson to peek out
          zIndex: 10,
        }}
      >
        <WeirdlingWilson />

        <Toolbar sx={{ zIndex: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: 1,
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
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </Button>
            ) : (
              <>
                {isAdmin && (
                  <Button
                    component={RouterLink}
                    to="/admin"
                    sx={{ color: 'white' }}
                  >
                    Admin Console
                  </Button>
                )}
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
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', py: 8 }}>
          <Container maxWidth="md">
            <Paper
              data-testid="hero-paper"
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
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.2rem',
                  }}
                >
                  {session ? 'Enter Your Dashboard' : 'Explore The Guild'}
                </Button>
              </Stack>
            </Paper>
          </Container>
        </Box>

        {/* MISSION GRID */}
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.9)', py: 8 }}>
          <Container maxWidth="lg">
            <Stack
              component="section"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 4,
              }}
            >
              {[
                {
                  title: 'Our Vision',
                  body: 'We envision a world where professional communities are open and built around people rather than gatekeeping.',
                },
                {
                  title: 'Our Team',
                  body: 'We are a fully volunteer, open-source software community working through shared effort.',
                },
                {
                  title: 'Our Pride',
                  body: 'WRDLNKDN is shaped by people who choose authenticity over conformity.',
                },
              ].map((item, i) => (
                <Paper key={i} sx={{ p: 3, bgcolor: GRID_CARD_BG }}>
                  <Stack spacing={2}>
                    <Typography
                      variant="h6"
                      component="h3"
                      color="primary.light"
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.7, color: GRID_TEXT_COLOR }}
                    >
                      {item.body}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Container>
        </Box>
      </Box>

      {/* FOOTER */}
      <Box
        component="footer"
        sx={{
          py: 3,
          bgcolor: 'black',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="body2"
            sx={{ color: 'grey.500', textAlign: 'center' }}
          >
            © {new Date().getFullYear()} WRDLNKDN. Built by Humans.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;

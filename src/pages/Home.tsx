import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid, // PATCH 1: Upgrade to Grid2 to support 'size' prop
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getContrastColor } from '../utils/contrast'; // PATCH 2: Fixed typo 'constrast' -> 'contrast'

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
      const redirectTo = `${window.location.origin}/auth/callback?next=/admin`;
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
        component="header" // PATCH 3: Semantic Header
        position="static"
        color="transparent"
        elevation={0}
        sx={{ bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}
      >
        <Toolbar>
          <Typography
            variant="h6" // Visually small
            component="div" // Not a heading, just brand text
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
                    aria-label="Signing in..." // Accessibility Name
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
      {/* MAIN LANDMARK: Wraps all primary content */}
      <Box
        component="main" // PATCH 3: Semantic Main (Fixes "Missing Landmark" and "Orphaned Content")
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
                  {/* 1. The Brand (H1) */}
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                      fontWeight: 900,
                      mb: 0.5, // Tighten gap to the pronunciation
                      color: HERO_TEXT_COLOR,
                      letterSpacing: 2,
                    }}
                  >
                    WRDLNKDN
                  </Typography>

                  {/* 2. April's Request: The Phonetic Guide */}
                  <Typography
                    variant="h5"
                    component="p" // Semantic paragraph (not a heading)
                    sx={{
                      mb: 3, // Push the tagline down
                      fontWeight: 400,
                      opacity: 0.6, // Visually subtle
                      color: HERO_TEXT_COLOR,
                    }}
                  >
                    (Weird Link-uh-din)
                  </Typography>

                  {/* 3. The Tagline (H2) */}
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      opacity: 0.9,
                      fontWeight: 300,
                      color: HERO_TEXT_COLOR,
                    }}
                  >
                    Professional networking, but{' '}
                    <Box
                      component="span"
                      sx={{ color: 'primary.main', fontWeight: 'bold' }}
                    >
                      human
                    </Box>
                    .
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {error}
                  </Alert>
                )}

                <Button
                  component={RouterLink}
                  to="/directory"
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
                  Enter Directory
                </Button>

                <Typography
                  variant="caption"
                  sx={{ opacity: 0.5, color: HERO_TEXT_COLOR }}
                >
                  Join the Guild of the Verified Generalists.
                </Typography>
              </Stack>
            </Paper>
          </Container>
        </Box>

        <Box sx={{ bgcolor: 'rgba(0,0,0,0.9)', py: 8 }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              {/* Column 1 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }}>
                  {/* H3: Section Headers */}
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    color="primary.light"
                  >
                    Verified Profiles
                  </Typography>
                  <Typography
                    variant="body2" // PATCH 5: Restored Correct Text
                    sx={{ opacity: 0.7, color: GRID_TEXT_COLOR }}
                  >
                    No bots. No spam. Just real humans vetted by actual
                    moderators. We prioritize authenticity over engagement
                    metrics.
                  </Typography>
                </Paper>
              </Grid>

              {/* Column 2 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }}>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    color="primary.light"
                  >
                    Human OS
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.7, color: GRID_TEXT_COLOR }}
                  >
                    Built on the philosophy that professional life
                    shouldn&apos;t require turning off your personality.
                    &quot;Weird&quot; is just another word for &quot;High
                    Definition.&quot;
                  </Typography>
                </Paper>
              </Grid>

              {/* Column 3 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }}>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    color="primary.light"
                  >
                    Community Led
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.7, color: GRID_TEXT_COLOR }}
                  >
                    Admins approve requests, but the community sets the tone. A
                    directory for those who ship, build, and verify.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>{' '}
      {/* END MAIN */}
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

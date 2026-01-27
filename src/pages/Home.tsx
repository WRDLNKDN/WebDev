import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getContrastColor } from '../utils/constrast'; // <--- IMPORT THE TOOL

// 1. High-Fidelity Assets & Constants
const SYNERGY_BG = 'url("/assets/background.svg")';

// 2. Define the Card Colors (Single Source of Truth)
// We define them here so we can pass them to the calculator
const HERO_CARD_BG = 'rgba(30, 30, 30, 0.85)';
const GRID_CARD_BG = 'rgba(255, 255, 255, 0.05)';

// 3. Calculate Contrast Dynamically
// The function runs immediately to set the text color constants
const HERO_TEXT_COLOR = getContrastColor(HERO_CARD_BG);
// Note: For very transparent backgrounds like GRID_CARD_BG, the HSP math sees "dark"
// because it ignores alpha. Since 0.05 is basically black/transparent on a black page,
// it will correctly return white.
const GRID_TEXT_COLOR = getContrastColor('#1a1a1a'); // Simulating the visual darkness of the grid card

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
      <AppBar
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
                  <CircularProgress size={24} color="inherit" />
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

      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', py: 8 }}>
        <Container maxWidth="md">
          <Paper
            elevation={24}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              bgcolor: HERO_CARD_BG, // Use Constant
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
                  sx={{ fontWeight: 900, mb: 1, color: HERO_TEXT_COLOR }} // Dynamic!
                >
                  WeirdLinkedIn
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ opacity: 0.8, fontWeight: 300, color: GRID_TEXT_COLOR }}
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
                sx={{ opacity: 0.5, color: GRID_TEXT_COLOR }}
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
              <Paper
                sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }} // Use Constant
              >
                <Typography variant="h6" gutterBottom color="primary.light">
                  Verified Profiles
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.5, color: GRID_TEXT_COLOR }}
                >
                  Join the Guild of the Verified Generalists.
                </Typography>
              </Paper>
            </Grid>

            {/* Column 2 */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }} // Use Constant
              >
                <Typography variant="h6" gutterBottom color="primary.light">
                  Human OS
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.7, color: GRID_TEXT_COLOR }}
                >
                  Built on the philosophy that professional life shouldn&apos;t
                  require turning off your personality. &amp;Weird&amp; is just
                  another word for &amp;High Definition.&amp;
                </Typography>
              </Paper>
            </Grid>

            {/* Column 3 */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{ p: 3, height: '100%', bgcolor: GRID_CARD_BG }} // Use Constant
              >
                <Typography variant="h6" gutterBottom color="primary.light">
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

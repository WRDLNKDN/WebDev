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
            // 🚀 USER FOUND: Redirect immediately to Feed
            navigate('/directory', { replace: true });
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
        navigate('/directory', { replace: true });
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
            {/* --- LEFT COLUMN: Guest Gateway --- */}
            <Grid size={{ xs: 12, md: 6 }}>
              {error && (
                <Alert
                  severity="error"
                  onClose={() => setError(null)}
                  sx={{ mb: 2 }}
                >
                  Create account
                </Button>
                <Menu
                  anchorEl={createAnchor}
                  open={Boolean(createAnchor)}
                  onClose={() => setCreateAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                  <MenuItem
                    onClick={() => void handleCreateAccount('google')}
                    sx={{ minWidth: 220 }}
                  >
                    <ListItemIcon>
                      <GoogleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Create account with Google</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => void handleCreateAccount('azure')}
                    sx={{ minWidth: 220 }}
                  >
                    <ListItemIcon>
                      <MicrosoftIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Create account with Microsoft</ListItemText>
                  </MenuItem>
                </Menu>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={(e) => setSignInAnchor(e.currentTarget)}
                  disabled={busy}
                  endIcon={
                    busy ? (
                      <CircularProgress size={16} aria-label="Signing in" />
                    ) : undefined
                  }
                >
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>
                <Menu
                  anchorEl={signInAnchor}
                  open={Boolean(signInAnchor)}
                  onClose={() => setSignInAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                  <MenuItem
                    onClick={() => void handleSignIn('google')}
                    sx={{ minWidth: 200 }}
                  >
                    <ListItemIcon>
                      <GoogleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Google</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => void handleSignIn('azure')}
                    sx={{ minWidth: 200 }}
                  >
                    <ListItemIcon>
                      <MicrosoftIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Microsoft</ListItemText>
                  </MenuItem>
                </Menu>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Button
                  component={RouterLink}
                  to="/directory"
                  variant="contained"
                  size="large"
                  disabled={busy}
                >
                  View directory
                </Button>

                {isAdmin && (
                  <Button
                    component={RouterLink}
                    to="/admin"
                    variant="outlined"
                    size="large"
                    disabled={busy}
                  >
                    Admin moderation
                  </Button>
                )}

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => void signOut()}
                  disabled={busy}
                  startIcon={
                    busy ? (
                      <CircularProgress size={16} aria-label="Signing out" />
                    ) : null
                  }
                >
                  {busy ? 'Signing out…' : 'Sign out'}
                </Button>
              </React.Fragment>
            )}
          </Grid>
        </Container>
      </Box>
    </>
  );
};

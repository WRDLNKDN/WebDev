// src/pages/Home.tsx
import { useEffect, useState } from 'react';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

import { signInWithOAuth, type OAuthProvider } from '../lib/signInWithOAuth';
import { supabase } from '../lib/supabaseClient';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

const BG_SX = {
  minHeight: '100vh',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  px: 2,
  py: 6,
  backgroundColor: '#05070f',
  backgroundImage: 'url(/landing-bg.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden',
  '::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.35), rgba(0,0,0,0.85))',
  },
};

const CARD_SX = {
  position: 'relative',
  width: '100%',
  maxWidth: 920,
  mx: 'auto',
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.12)',
  bgcolor: 'rgba(16, 18, 24, 0.70)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
  p: { xs: 3, sm: 4 },
  color: '#fff',
};

export const Home = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signInAnchor, setSignInAnchor] = useState<HTMLElement | null>(null);

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

        if (error) {
          setIsAdmin(false);
          return;
        }

        setIsAdmin(Boolean(data));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSignIn = async (provider: OAuthProvider) => {
    setSignInAnchor(null);
    setBusy(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        '/directory',
      )}`;

      const { error: signInError } = await signInWithOAuth(provider, {
        redirectTo,
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
      // Use LOCAL logout for dev reliability.
      // Global signout can be slow/hang depending on provider/session state.
      const { error: outErr } = await supabase.auth.signOut();
      if (outErr) throw outErr;

      // Also clear our explicit storage key so UI can't "stick"
      try {
        localStorage.removeItem('sb-wrdlnkdn-auth');
      } catch {
        // ignore
      }

      setSession(null);

      // Force UI reset
      window.location.assign('/');
    } catch (e: unknown) {
      setError(toMessage(e));
      setBusy(false);
    }
  };

  return (
    <Box sx={BG_SX}>
      <Container maxWidth="md" sx={CARD_SX}>
        {!session && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            {`You're browsing as a guest. Create an account to submit a profile or sign in if you've already applied.`}
          </Alert>
        )}

        <Stack spacing={2}>
          <Typography
            component="h1"
            variant="h3"
            sx={{ fontWeight: 900, lineHeight: 1.1, color: '#fff' }}
          >
            Welcome to WRDLNKDN
          </Typography>

          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            Professional networking, but human.
          </Typography>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            This is a curated directory. You submit a request, admins review it,
            and once approved you appear in the member list.
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                bgcolor: 'rgba(211, 47, 47, 0.15)',
                border: '1px solid rgba(211, 47, 47, 0.3)',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              {error}
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ pt: 1 }}
          >
            {!session ? (
              <>
                <Button
                  component={RouterLink}
                  to="/signup"
                  variant="contained"
                  size="large"
                  disabled={busy}
                >
                  Create account
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={(e) => setSignInAnchor(e.currentTarget)}
                  disabled={busy}
                  endIcon={busy ? <CircularProgress size={16} /> : undefined}
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
                    <ListItemText>Sign in with Google</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => void handleSignIn('azure')}
                    sx={{ minWidth: 200 }}
                  >
                    <ListItemIcon>
                      <MicrosoftIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Sign in with Microsoft</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
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
                  startIcon={busy ? <CircularProgress size={16} /> : null}
                >
                  {busy ? 'Signing out…' : 'Sign out'}
                </Button>
              </>
            )}
          </Stack>

          <Box sx={{ pt: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Local dev note: Admin access is enforced by allowlist server-side.
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default Home;

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabaseClient';

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
        setSession(newSession);
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

  const signInGoogle = async () => {
    setBusy(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
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
    <Box component="main" sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {!session && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You’re browsing as a guest. Create an account to submit a profile
              or sign in if you’ve already applied.
            </Alert>
          )}

          <Stack spacing={2}>
            <Typography
              component="h1"
              variant="h3"
              sx={{ fontWeight: 800, lineHeight: 1.1 }}
            >
              WRDLNKDN
            </Typography>

            <Typography variant="body1" sx={{ opacity: 0.85 }}>
              Professional networking, but human.
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Browse approved profiles in the directory. Members can submit a
              registration request. Admins approve or reject registrations
              before they appear publicly.
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

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
                  >
                    Create account
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => void signInGoogle()}
                    disabled={busy}
                  >
                    Sign in with Google
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    component={RouterLink}
                    to="/directory"
                    variant="contained"
                    size="large"
                  >
                    View directory
                  </Button>

                  {isAdmin && (
                    <Button
                      component={RouterLink}
                      to="/admin"
                      variant="outlined"
                      size="large"
                    >
                      Admin moderation
                    </Button>
                  )}

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => void signOut()}
                    disabled={busy}
                  >
                    Sign out
                  </Button>
                </>
              )}
            </Stack>

            <Box sx={{ pt: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Local dev note: Admin access is enforced by allowlist
                server-side.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

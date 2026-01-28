import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabaseClient';
import { AdminModerationPage } from './AdminModerationPage';
import { AdminGate } from './AdminGate';
import type { ProfileStatus } from '../../types/types';

type Props = {
  initialStatus?: ProfileStatus | 'all';
};

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

export const AdminApp = ({ initialStatus = 'pending' }: Props) => {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) setError(toMessage(sessionError));
      setSession(data.session ?? null);
      setLoading(false);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt, newSession) => {
        if (!cancelled) {
          setSession(newSession ?? null);
          setLoading(false);
        }
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
    setError(null);
    setBusy(true);

    try {
      await supabase.auth.signOut({ scope: 'global' });

      // Update UI state immediately
      setSession(null);

      // Navigate and force a reload to wipe any stale in-memory state
      window.location.assign('/');
    } catch (e: unknown) {
      setError(toMessage(e));
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AdminGate>
      <Box component="main" sx={{ py: 4 }}>
        <Container maxWidth="lg">
          <Typography
            component="h1"
            variant="h4"
            sx={{ fontWeight: 800 }}
            gutterBottom
          >
            Admin
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!session ? (
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void signInGoogle()}
                  disabled={busy}
                >
                  Sign in with Google
                </Button>
              }
            >
              You are not signed in.
            </Alert>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => void signOut()}
                  disabled={busy}
                  startIcon={busy ? <CircularProgress size={16} /> : null}
                >
                  {busy ? 'Signing out...' : 'Sign out'}
                </Button>
              </Box>

              <AdminModerationPage
                token={session.access_token}
                initialStatus={initialStatus}
              />
            </>
          )}
        </Container>
      </Box>
    </AdminGate>
  );
};

export default AdminApp;

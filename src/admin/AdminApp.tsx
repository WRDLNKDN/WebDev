// src/admin/AdminApp.tsx
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Typography } from '@mui/material';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabaseClient';
import { AdminModerationPage } from './AdminModerationPage';
import { AdminGate } from './AdminGate';
import type { ProfileStatus } from '../types/types';

type Props = {
  initialStatus?: ProfileStatus | 'all';
};

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

/**
 * Named export (required for React.lazy().then(m => ({ default: m.AdminApp })))
 */
export const AdminApp = ({ initialStatus = 'pending' }: Props) => {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) setError(toMessage(sessionError));
      setSession(data.session ?? null);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = async () => {
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/admin`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (signInError) setError(toMessage(signInError));
  };

  const signOut = async () => {
    setError(null);
    const { error: outError } = await supabase.auth.signOut();
    if (outError) setError(toMessage(outError));
  };

  return (
    <AdminGate>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
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
              <Button variant="outlined" onClick={() => void signOut()}>
                Sign out
              </Button>
            </Box>

            <AdminModerationPage
              token={session.access_token}
              initialStatus={initialStatus}
            />
          </>
        )}
      </Container>
    </AdminGate>
  );
};

/**
 * Default export kept for convenience.
 * (Does not break the named export.)
 */
export default AdminApp;
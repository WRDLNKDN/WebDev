import {
  Alert,
  Box,
  Button,
  Container,
  CircularProgress,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { toMessage } from '../../lib/errors';
import { supabase } from '../../lib/supabaseClient';
import { AdminGate } from './AdminGate';
import { AdminLayout } from './AdminLayout';
import { AdminSessionProvider } from './AdminSessionContext';

export const AdminApp = () => {
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
    setBusy(true);
    setError(null);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      localStorage.removeItem('wrdlnkdn-auth');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (e: unknown) {
      setError(toMessage(e));
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AdminGate>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#05070f',
          }}
        >
          <Container maxWidth="sm">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={22} />
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Loading admin…
              </Typography>
            </Box>
          </Container>
        </Box>
      </AdminGate>
    );
  }

  return (
    <AdminGate>
      <AdminSessionProvider value={session}>
        {!session ? (
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#05070f',
              p: 4,
            }}
          >
            <Box
              sx={{
                maxWidth: 400,
                p: 4,
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.12)',
                bgcolor: 'rgba(16, 18, 24, 0.8)',
              }}
            >
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                Admin Sign In
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mb: 3 }}>
                Sign in with Google to access the admin panel.
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Button
                variant="contained"
                onClick={() => void signInGoogle()}
                disabled={busy}
                fullWidth
              >
                {busy ? 'Signing in…' : 'Sign in with Google'}
              </Button>
            </Box>
          </Box>
        ) : (
          <AdminLayout
            session={session}
            onSignOut={() => void signOut()}
            signOutBusy={busy}
          >
            <Outlet />
          </AdminLayout>
        )}
      </AdminSessionProvider>
    </AdminGate>
  );
};

export default AdminApp;

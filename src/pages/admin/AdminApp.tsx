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

const BG_SX = {
  minHeight: '100vh',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  px: 2,
  py: 6,
  backgroundColor: '#05070f',
  backgroundImage: 'url(/assets/landing-bg.png)',
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
  maxWidth: 1400,
  mx: 'auto',
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.12)',
  bgcolor: 'rgba(16, 18, 24, 0.70)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
  p: { xs: 3, sm: 4 },
  color: '#fff',
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
    console.log('🔴 ADMIN SIGN IN: Starting');
    setBusy(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/admin`;
      console.log('🔴 ADMIN SIGN IN: redirectTo =', redirectTo);

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
      console.log('🔴 Signing out...');

      await supabase.auth.signOut({ scope: 'global' });
      localStorage.removeItem('wrdlnkdn-auth');
      localStorage.clear();
      sessionStorage.clear();

      console.log('✅ Signed out, reloading...');
      window.location.href = '/';
    } catch (e: unknown) {
      console.error('❌ Sign out error:', e);
      setError(toMessage(e));
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={BG_SX}>
        <Container maxWidth="sm" sx={CARD_SX}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Loading admin…
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <AdminGate>
      <Box sx={BG_SX}>
        <Container maxWidth="xl" sx={CARD_SX}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography component="h1" variant="h4" sx={{ fontWeight: 900 }}>
              Admin Moderation
            </Typography>

            {session && (
              <Button
                variant="outlined"
                onClick={() => void signOut()}
                disabled={busy}
                startIcon={busy ? <CircularProgress size={16} /> : null}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#fff',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.5)',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                {busy ? 'Signing out...' : 'Sign out'}
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!session ? (
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75, mb: 3 }}>
                Please sign in with Google to access the admin panel.
              </Typography>
              <Button
                variant="contained"
                onClick={() => void signInGoogle()}
                disabled={busy}
              >
                Sign in with Google
              </Button>
            </Box>
          ) : (
            <AdminModerationPage
              token={session.access_token}
              initialStatus={initialStatus}
            />
          )}
        </Container>
      </Box>
    </AdminGate>
  );
};

export default AdminApp;

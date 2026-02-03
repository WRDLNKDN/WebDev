import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Stack,
  Toolbar,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export const Navbar = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  // Weirdling rotation state
  const [weirdlingIndex, setWeirdlingIndex] = useState(1);
  const totalWeirdlings = 24;

  useEffect(() => {
    const interval = setInterval(() => {
      setWeirdlingIndex((prev) => (prev % totalWeirdlings) + 1);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  // Auth session wiring
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSession(data.session ?? null);
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

  // Admin check
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

        setIsAdmin(!error && data === true);
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

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        '/dashboard',
      )}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (error) throw error;
    } catch (error) {
      console.error(error);
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);

    try {
      await supabase.auth.signOut();
      localStorage.removeItem('sb-wrdlnkdn-auth');
      setSession(null);
      navigate('/');
    } catch (error) {
      console.error(error);
      setBusy(false);
    }
  };

  return (
    <AppBar
      component="nav"
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        bgcolor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <Toolbar sx={{ py: 1 }}>
        {/* Brand */}
        <Box
          component={RouterLink}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            mr: 2,
            width: '64px',
            height: '64px',
            overflow: 'hidden',
            borderRadius: '12px',
            position: 'relative',
          }}
        >
          <Box
            component="img"
            src={`/assets/weirdling_${weirdlingIndex}.png`}
            alt="WRDLNKDN Logo"
            sx={{
              height: '100%',
              width: 'auto',
              transform: 'scale(2.1) translateY(10%)',
              transition: 'all 0.5s ease-in-out',
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Menu */}
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
  );
};

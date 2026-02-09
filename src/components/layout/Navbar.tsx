import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { signInWithOAuth, type OAuthProvider } from '../../lib/signInWithOAuth';
import { supabase } from '../../lib/supabaseClient';

export const Navbar = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signInAnchor, setSignInAnchor] = useState<HTMLElement | null>(null);

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
        const { data, error } = (await supabase.rpc('is_admin')) as {
          data: boolean | null;
          error: Error | null;
        };
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

  const handleSignIn = async (provider: OAuthProvider) => {
    setSignInAnchor(null);
    setBusy(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        '/directory',
      )}`;

      const { data, error } = await signInWithOAuth(provider, { redirectTo });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
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
        <Stack direction="row" spacing={2} alignItems="center">
          {!session ? (
            <>
              <Button
                component={RouterLink}
                to="/signup"
                sx={{ color: 'white' }}
              >
                Create account
              </Button>
              <Button
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={(e) => setSignInAnchor(e.currentTarget)}
                disabled={busy}
                endIcon={
                  busy ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : undefined
                }
              >
                Sign in
              </Button>
              <Menu
                anchorEl={signInAnchor}
                open={Boolean(signInAnchor)}
                onClose={() => setSignInAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { minWidth: 200 } } }}
              >
                <MenuItem
                  onClick={() => void handleSignIn('google')}
                  disabled={busy}
                >
                  <ListItemIcon>
                    <GoogleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Sign in with Google</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => void handleSignIn('azure')}
                  disabled={busy}
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

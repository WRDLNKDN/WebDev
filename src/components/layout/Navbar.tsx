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
import { WEIRDLING_ASSET_COUNT } from '../../types/weirdling';

export const Navbar = () => {
  const navigate = useNavigate();
  const [weirdlingIndex, setWeirdlingIndex] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setWeirdlingIndex((prev) => (prev % WEIRDLING_ASSET_COUNT) + 1);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signInAnchor, setSignInAnchor] = useState<HTMLElement | null>(null);

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
      // UPDATED: Redirect to the Directory (Feed) instead of Dashboard
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        '/feed',
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
        bgcolor: 'rgba(18, 18, 18, 0.9)', // Deep glass effect
        backdropFilter: 'blur(12px)',
        zIndex: 1100,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Toolbar sx={{ py: 0.5 }}>
        {/* BRAND LOGO AREA */}
        <Box
          component={RouterLink}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            mr: 3,
            height: '64px',
          }}
        >
          <Box
            component="img"
            src={`/assets/og_weirdlings/weirdling_${weirdlingIndex}.png`}
            alt="WRDLNKDN Logo"
            sx={{
              height: '32px', // Standard Nav Logo height
              width: 'auto',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 },
            }}
          />
        </Box>

        <Button component={RouterLink} to="/store" sx={{ color: 'white' }}>
          Store
        </Button>
        {session && (
          <>
            <Button
              component={RouterLink}
              to="/directory"
              sx={{ color: 'white' }}
            >
              Directory
            </Button>
            <Button component={RouterLink} to="/feed" sx={{ color: 'white' }}>
              Feed
            </Button>
            <Button
              component={RouterLink}
              to="/dashboard"
              sx={{ color: 'white' }}
            >
              Profile
            </Button>
          </>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* --- AUTH / ACTIONS --- */}
        <Stack direction="row" spacing={2} alignItems="center">
          {!session ? (
            <>
              {/* Sign Up: Text Link */}
              <Button
                component={RouterLink}
                to="/signup"
                sx={{ color: 'text.secondary', '&:hover': { color: 'white' } }}
              >
                Join now
              </Button>

              {/* Sign In: Pill Button */}
              <Button
                variant="outlined"
                onClick={(e) => setSignInAnchor(e.currentTarget)}
                disabled={busy}
                sx={{
                  borderRadius: 20,
                  px: 3,
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
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
                slotProps={{
                  paper: { sx: { minWidth: 220, mt: 1, borderRadius: 2 } },
                }}
              >
                <MenuItem
                  onClick={() => void handleSignIn('google')}
                  disabled={busy}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon>
                    <GoogleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Google</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => void handleSignIn('azure')}
                  disabled={busy}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon>
                    <MicrosoftIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Microsoft</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              {isAdmin && (
                <Button
                  component={RouterLink}
                  to="/admin"
                  sx={{ color: 'warning.main' }}
                >
                  Admin
                </Button>
              )}

              <Button
                sx={{ color: 'text.secondary' }}
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

import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';
import {
  getErrorMessage,
  toMessage,
  MICROSOFT_SIGNIN_NOT_CONFIGURED,
} from '../../lib/utils/errors';
import { signInWithOAuth } from '../../lib/auth/signInWithOAuth';
import { supabase } from '../../lib/auth/supabaseClient';
import { getSessionWithTimeout } from '../../lib/auth/getSessionWithTimeout';
import { useOAuthReturnReset } from '../../lib/auth/useOAuthReturnReset';
import {
  APP_GLASS_BORDER,
  APP_GLASS_SHADOW,
  APP_GLASS_SURFACE,
  AUTH_SCREEN_BG,
} from '../../theme/candyStyles';

export const SignIn = () => {
  const feedEnabled = useFeatureFlag('feed');
  const dashboardEnabled = useFeatureFlag('dashboard');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'azure' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await getSessionWithTimeout();
      if (!cancelled) setSession(!!data.session);
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!cancelled) setSession(!!s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const postAuthPath = feedEnabled
    ? '/feed'
    : dashboardEnabled
      ? '/dashboard'
      : '/';

  useOAuthReturnReset({
    loading,
    reset: () => {
      setLoading(false);
      setLoadingProvider(null);
    },
  });

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    setLoading(true);
    setLoadingProvider(provider);
    setError(null);

    try {
      const { data, error: authError } = await signInWithOAuth(provider, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthPath)}`,
      });

      if (authError) throw authError;

      if (data.url) window.location.href = data.url;
    } catch (err) {
      const msg = getErrorMessage(err, 'Authentication failed');
      if (
        msg.toLowerCase().includes('provider') &&
        msg.toLowerCase().includes('not enabled')
      ) {
        setError(MICROSOFT_SIGNIN_NOT_CONFIGURED);
      } else {
        setError(toMessage(err));
      }
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  if (session === true) {
    return <Navigate to={postAuthPath} replace />;
  }

  if (session === null) {
    return (
      <Box
        sx={{
          ...AUTH_SCREEN_BG,
          minHeight: '100dvh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          px: 2,
        }}
      >
        <CircularProgress aria-label="Checking sign-in status" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...AUTH_SCREEN_BG,
        minHeight: '100dvh',
        py: 6,
        px: 2,
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: APP_GLASS_BORDER,
            bgcolor: APP_GLASS_SURFACE,
            color: '#FFFFFF',
            backdropFilter: 'blur(12px)',
            boxShadow: APP_GLASS_SHADOW,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Sign In
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Welcome back to WRDLNKDN
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => void handleOAuthSignIn('google')}
              disabled={loading}
              startIcon={
                loadingProvider === 'google' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <GoogleIcon />
                )
              }
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                justifyContent: 'flex-start',
              }}
            >
              {loadingProvider === 'google'
                ? 'Signing in with Google…'
                : 'Sign in with Google'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => void handleOAuthSignIn('azure')}
              disabled={loading}
              startIcon={
                loadingProvider === 'azure' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <MicrosoftIcon />
                )
              }
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                justifyContent: 'flex-start',
              }}
            >
              {loadingProvider === 'azure'
                ? 'Signing in with Microsoft…'
                : 'Sign in with Microsoft'}
            </Button>

            <Divider />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {"Don't have an account? "}
                <Typography
                  component={RouterLink}
                  to="/join"
                  sx={{ color: 'primary.main', textDecoration: 'underline' }}
                >
                  Join
                </Typography>
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default SignIn;

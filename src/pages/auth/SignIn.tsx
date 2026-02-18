import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  toMessage,
  MICROSOFT_SIGNIN_NOT_CONFIGURED,
} from '../../lib/utils/errors';
import { signInWithOAuth } from '../../lib/auth/signInWithOAuth';

export const SignIn = () => {
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'azure' | null
  >(null);
  const [providerAnchor, setProviderAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    setLoading(true);
    setLoadingProvider(provider);
    setError(null);

    try {
      const { data, error: authError } = await signInWithOAuth(provider, {
        redirectTo: `${window.location.origin}/auth/callback?next=/feed`,
      });

      if (authError) throw authError;

      if (data.url) window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
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

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
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
              onClick={(e) => setProviderAnchor(e.currentTarget)}
              disabled={loading}
              startIcon={
                loadingProvider ? (
                  <CircularProgress size={20} color="inherit" />
                ) : undefined
              }
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                justifyContent: 'flex-start',
              }}
            >
              {loadingProvider ? 'Signing in…' : 'Sign in'}
            </Button>
            <Menu
              anchorEl={providerAnchor}
              open={Boolean(providerAnchor)}
              onClose={() => setProviderAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <MenuItem
                onClick={() => {
                  setProviderAnchor(null);
                  void handleOAuthSignIn('google');
                }}
                disabled={loading}
                sx={{ minWidth: 240 }}
              >
                <GoogleIcon fontSize="small" sx={{ mr: 1.5 }} />
                Google
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setProviderAnchor(null);
                  void handleOAuthSignIn('azure');
                }}
                disabled={loading}
                sx={{ minWidth: 240 }}
              >
                <MicrosoftIcon fontSize="small" sx={{ mr: 1.5 }} />
                Microsoft
              </MenuItem>
            </Menu>

            <Divider />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {"Don't have an account? "}
                <Typography
                  component={RouterLink}
                  to="/join"
                  sx={{ color: 'primary.main', textDecoration: 'underline' }}
                >
                  Sign up
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

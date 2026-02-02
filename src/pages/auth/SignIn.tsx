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
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export const SignIn = () => {
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'azure' | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    setLoading(true);
    setLoadingProvider(provider);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (data.url) window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (
        msg.toLowerCase().includes('provider') &&
        msg.toLowerCase().includes('not enabled')
      ) {
        setError(
          'Microsoft sign-in is not configured. Add SUPABASE_AZURE_CLIENT_ID and SUPABASE_AZURE_CLIENT_SECRET to your .env, then run: supabase stop && supabase start. See supabase/README.md.',
        );
      } else {
        setError(msg);
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

            <Stack spacing={2}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
                startIcon={
                  loadingProvider === 'google' ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <GoogleIcon />
                  )
                }
                fullWidth
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  justifyContent: 'flex-start',
                  borderColor: 'rgba(66, 133, 244, 0.5)',
                  color: '#4285f4',
                  '&:hover': {
                    borderColor: '#4285f4',
                    bgcolor: 'rgba(66, 133, 244, 0.08)',
                  },
                }}
              >
                Sign in with Google
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => handleOAuthSignIn('azure')}
                disabled={loading}
                startIcon={
                  loadingProvider === 'azure' ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <MicrosoftIcon />
                  )
                }
                fullWidth
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  justifyContent: 'flex-start',
                  borderColor: 'rgba(0, 120, 212, 0.5)',
                  color: '#0078d4',
                  '&:hover': {
                    borderColor: '#0078d4',
                    bgcolor: 'rgba(0, 120, 212, 0.08)',
                  },
                }}
              >
                Sign in with Microsoft
              </Button>
            </Stack>

            <Divider />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {"Don't have an account? "}
                <Typography
                  component={RouterLink}
                  to="/signup"
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

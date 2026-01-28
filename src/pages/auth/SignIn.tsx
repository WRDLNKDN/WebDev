import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export const SignIn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    setLoading(true);
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
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
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
                startIcon={loading ? <CircularProgress size={20} /> : null}
                fullWidth
              >
                Sign in with Google
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => handleOAuthSignIn('azure')}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
                fullWidth
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

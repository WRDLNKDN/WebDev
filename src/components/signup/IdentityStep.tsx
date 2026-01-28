import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';

import { useSignup } from '../../context/useSignup';
import { supabase } from '../../lib/supabaseClient';

export const IdentityStep = () => {
  const { goToStep, markComplete, setIdentity } = useSignup();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const hasCheckedAuth = useRef(false);
  const hasAdvanced = useRef(false);

  const canProceed = termsAccepted && guidelinesAccepted;

  useEffect(() => {
    if (hasCheckedAuth.current) {
      setCheckingAuth(false);
      return;
    }

    hasCheckedAuth.current = true;

    const checkAuthentication = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setCheckingAuth(false);
          return;
        }

        if (session?.user && !hasAdvanced.current) {
          console.log('Session found, advancing to values step');
          hasAdvanced.current = true;

          setIdentity({
            provider: 'google',
            userId: session.user.id,
            email: session.user.email || '',
            termsAccepted: true,
            guidelinesAccepted: true,
            timestamp: new Date().toISOString(),
          });

          // tiny tick so context/state updates settle before navigation
          await new Promise((resolve) => setTimeout(resolve, 0));

          markComplete('identity');
          goToStep('values');
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    void checkAuthentication();
  }, [goToStep, markComplete, setIdentity]);

  const handleGoogleSignIn = async () => {
    if (!canProceed) {
      setError('Please accept the Terms and Community Guidelines to continue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/signup`,
        },
      });

      if (authError) throw authError;

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('OAuth redirect URL missing');
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
    }
  };

  const handleBack = () => {
    goToStep('welcome');
  };

  if (checkingAuth) {
    return (
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              justifyContent: 'center',
              py: 4,
            }}
          >
            <CircularProgress size={24} />
            <Typography>Checking authentication...</Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
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
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Verify Your Identity
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Sign in with Google to continue
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
              onClick={() => void handleGoogleSignIn()}
              disabled={loading || !canProceed}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              fullWidth
            >
              Continue with Google
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={loading}
                />
              }
              label={
                <Typography variant="body2">
                  I accept the{' '}
                  <Typography
                    component="a"
                    href="/terms"
                    target="_blank"
                    sx={{ color: 'primary.main', textDecoration: 'underline' }}
                  >
                    Terms of Service
                  </Typography>
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={guidelinesAccepted}
                  onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                  disabled={loading}
                />
              }
              label={
                <Typography variant="body2">
                  I accept the{' '}
                  <Typography
                    component="a"
                    href="/guidelines"
                    target="_blank"
                    sx={{ color: 'primary.main', textDecoration: 'underline' }}
                  >
                    Community Guidelines
                  </Typography>
                </Typography>
              }
            />
          </Stack>

          <Box
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              We use OAuth for secure authentication. Your credentials are never
              stored on our servers.
            </Typography>
          </Box>

          <Button
            variant="text"
            onClick={handleBack}
            disabled={loading}
            sx={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default IdentityStep;

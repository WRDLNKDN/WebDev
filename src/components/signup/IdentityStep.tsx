import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Container,
    FormControlLabel,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { useSignup } from '../../context/useSignup';
import { supabase } from '../../lib/supabaseClient';
import type { IdentityProvider } from '../../types/signup';
import './IdentityStep.css';
import './signup.css';

const mapSupabaseProvider = (
  user: {
    identities?: { provider?: string }[];
    app_metadata?: { provider?: string };
  },
): IdentityProvider => {
  const p =
    user.identities?.[0]?.provider ?? user.app_metadata?.provider ?? 'google';
  return p === 'azure' ? 'microsoft' : 'google';
};

export const IdentityStep = () => {
  const { goToStep, markComplete, setIdentity } = useSignup();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'azure' | null
  >(null);
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

          const provider = mapSupabaseProvider(session.user);

          setIdentity({
            provider,
            userId: session.user.id,
            email: session.user.email || '',
            termsAccepted: true,
            guidelinesAccepted: true,
            timestamp: new Date().toISOString(),
          });

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

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    if (!canProceed) {
      setError('Please accept the Terms and Community Guidelines to continue');
      return;
    }

    setLoading(true);
    setLoadingProvider(provider);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
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
        setLoadingProvider(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (
        msg.toLowerCase().includes('provider') &&
        msg.toLowerCase().includes('not enabled')
      ) {
        setError(
          'Microsoft sign-in is not configured. Add SUPABASE_AZURE_CLIENT_ID and SUPABASE_AZURE_CLIENT_SECRET to your .env file, then run: supabase stop && supabase start. See supabase/README.md for details.',
        );
      } else {
        setError(msg);
      }
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleBack = () => {
    goToStep('welcome');
  };

  if (checkingAuth) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={0} className="signupPaper identityStep">
          <Box className="identityStepChecking">
            <CircularProgress size={24} />
            <Typography>Checking authentication...</Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={0} className="signupPaper identityStep">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" className="signupStepLabel">
              Verify Your Identity
            </Typography>
            <Typography variant="body2" className="signupStepSubtext">
              Sign in with Google or Microsoft to continue
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Typography
            variant="subtitle2"
            className="IdentityStep__policyTitle"
            sx={{ fontWeight: 600, mb: 1, display: 'block' }}
          >
            Before continuing, please review and accept:
          </Typography>
          <Stack spacing={2} sx={{ mb: 3 }}>
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
                    rel="noopener noreferrer"
                    className="signupLink"
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
                    rel="noopener noreferrer"
                    className="signupLink"
                  >
                    Community Guidelines
                  </Typography>
                </Typography>
              }
            />
          </Stack>

          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 1, display: 'block' }}
          >
            Choose your identity provider:
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => void handleOAuthSignIn('google')}
              disabled={loading || !canProceed}
              startIcon={
                loadingProvider === 'google' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <GoogleIcon />
                )
              }
              fullWidth
              className="IdentityStep__btn IdentityStep__btn--google"
            >
              Continue with Google
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => void handleOAuthSignIn('azure')}
              disabled={loading || !canProceed}
              startIcon={
                loadingProvider === 'azure' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <MicrosoftIcon />
                )
              }
              fullWidth
              className="IdentityStep__btn IdentityStep__btn--microsoft"
            >
              Continue with Microsoft
            </Button>
          </Stack>

          <Box className="identityStepInfoBox" sx={{ mt: 2 }}>
            <Typography variant="caption" className="signupStepSubtext">
              We use OAuth for secure authentication. Your credentials are never
              stored on our servers.
            </Typography>
          </Box>

          <Button
            variant="text"
            onClick={handleBack}
            disabled={loading}
            className="signupBackButton"
          >
            Back
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default IdentityStep;

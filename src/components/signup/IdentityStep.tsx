import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { useSignup } from '../../context/useSignup';
import {
  toMessage,
  MICROSOFT_SIGNIN_NOT_CONFIGURED,
} from '../../lib/utils/errors';
import { signInWithOAuth } from '../../lib/auth/signInWithOAuth';
import { supabase } from '../../lib/auth/supabaseClient';
import type { IdentityProvider } from '../../types/signup';
import {
  identityStepChecking,
  identityStepInfoBox,
  signupBackButton,
  signupLink,
  signupPaper,
  signupStepLabel,
  signupStepSubtext,
} from '../../theme/signupStyles';
import { POLICY_VERSION } from '../../types/signup';

const oauthButtonSx = {
  textTransform: 'none' as const,
  fontWeight: 600,
  py: 1.5,
  px: 2,
  minWidth: 200,
  whiteSpace: 'nowrap',
  borderWidth: 2,
  borderColor: 'rgba(255,255,255,0.5)',
  color: '#fff',
  bgcolor: 'rgba(255,255,255,0.06)',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.8)',
    bgcolor: 'rgba(255,255,255,0.12)',
  },
  '&.Mui-disabled': {
    borderColor: 'rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.4)',
  },
};

const mapSupabaseProvider = (user: {
  identities?: { provider?: string }[];
  app_metadata?: { provider?: string };
}): IdentityProvider => {
  const p =
    user.identities?.[0]?.provider ?? user.app_metadata?.provider ?? 'google';
  return p === 'azure' ? 'microsoft' : 'google';
};

export const IdentityStep = () => {
  const { state, goToStep, markComplete, setIdentity } = useSignup();

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

  // State verification: ensure user has viewed WelcomeStep to prevent zombie sessions
  useEffect(() => {
    if (!state.completedSteps.includes('welcome')) {
      goToStep('welcome');
    }
  }, [state.completedSteps, goToStep]);

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

        if (
          session?.user &&
          !hasAdvanced.current &&
          state.completedSteps.includes('welcome')
        ) {
          console.log('Session found, advancing to values step');
          hasAdvanced.current = true;

          const provider = mapSupabaseProvider(session.user);

          setIdentity({
            provider,
            userId: session.user.id,
            email: session.user.email || '',
            termsAccepted: true,
            guidelinesAccepted: true,
            policyVersion: POLICY_VERSION,
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
  }, [goToStep, markComplete, setIdentity, state.completedSteps]);

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    if (!canProceed) {
      setError('Please accept the Terms and Community Guidelines to continue');
      return;
    }

    setLoading(true);
    setLoadingProvider(provider);
    setError(null);

    try {
      const { data, error: authError } = await signInWithOAuth(provider, {
        redirectTo: `${window.location.origin}/auth/callback?next=/join`,
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
      const raw = err instanceof Error ? err.message : 'Authentication failed';
      const msg = raw.toLowerCase();

      const providerLabel = provider === 'google' ? 'Google' : 'Microsoft';

      if (msg.includes('provider') && msg.includes('not enabled')) {
        setError(MICROSOFT_SIGNIN_NOT_CONFIGURED);
      } else if (msg.includes('network') || msg.includes('timeout')) {
        setError(
          `${providerLabel} sign-in is having trouble connecting. Please check ` +
            `your connection and try again, or choose a different provider.`,
        );
      } else {
        setError(toMessage(err));
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
      <Box sx={{ width: '100%' }}>
        <Paper
          elevation={0}
          sx={{ ...signupPaper, bgcolor: 'transparent', border: 'none' }}
        >
          <Box sx={identityStepChecking}>
            <CircularProgress size={24} />
            <Typography>Checking authentication...</Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
      <Paper
        elevation={0}
        sx={{
          ...signupPaper,
          bgcolor: 'transparent',
          border: 'none',
          maxWidth: 560,
          mx: 'auto',
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" sx={signupStepLabel}>
              Sign in with intent
            </Typography>
            <Typography variant="body2" sx={signupStepSubtext}>
              Use your Google or Microsoft account to verify your identity.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 1, display: 'block' }}
          >
            Before entering, please confirm:
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
                  I agree to the{' '}
                  <Typography
                    component="a"
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={signupLink}
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
                  I agree to follow the{' '}
                  <Typography
                    component="a"
                    href="/guidelines"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={signupLink}
                  >
                    Community Guidelines
                  </Typography>
                </Typography>
              }
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => void handleOAuthSignIn('google')}
              disabled={loading || !canProceed}
              startIcon={
                loadingProvider === 'google' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <GoogleIcon />
                )
              }
              sx={oauthButtonSx}
            >
              {loadingProvider === 'google'
                ? 'Signing in…'
                : 'Sign in with Google'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => void handleOAuthSignIn('azure')}
              disabled={loading || !canProceed}
              startIcon={
                loadingProvider === 'azure' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <MicrosoftIcon />
                )
              }
              sx={oauthButtonSx}
            >
              {loadingProvider === 'azure'
                ? 'Signing in…'
                : 'Sign in with Microsoft'}
            </Button>
          </Stack>

          <Box sx={{ ...identityStepInfoBox, mt: 2 }}>
            <Typography variant="caption" sx={signupStepSubtext}>
              Secure OAuth authentication. We never store your credentials.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={loading}
            sx={{
              ...signupBackButton,
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.6)',
              color: '#fff',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.85)',
                bgcolor: 'rgba(255,255,255,0.08)',
              },
              '&.Mui-disabled': {
                borderColor: 'rgba(255,255,255,0.35)',
                color: 'rgba(255,255,255,0.6)',
              },
            }}
          >
            Back
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default IdentityStep;

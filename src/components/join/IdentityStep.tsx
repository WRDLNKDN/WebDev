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

import { useJoin } from '../../context/useJoin';
import {
  getErrorMessage,
  toMessage,
  MICROSOFT_SIGNIN_NOT_CONFIGURED,
} from '../../lib/utils/errors';
import { signInWithOAuth } from '../../lib/auth/signInWithOAuth';
import { supabase } from '../../lib/auth/supabaseClient';
import type { IdentityProvider } from '../../types/join';
import {
  identityStepChecking,
  identityStepOAuthNote,
  signupLink,
  signupPaper,
  signupStepLabel,
  signupStepSubtext,
} from '../../theme/joinStyles';
import { POLICY_VERSION } from '../../types/join';

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
    borderColor: 'rgba(255,255,255,0.25)',
    color: 'rgba(255,255,255,0.72)', // AAA readable disabled
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
  const { state, goToStep, markComplete, setIdentity } = useJoin();

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
  const redirectGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (redirectGuardRef.current) {
        clearTimeout(redirectGuardRef.current);
      }
    };
  }, []);

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
        // Android/webview browsers can occasionally fail to follow OAuth redirect.
        // Recover by clearing loading state and surfacing guidance.
        if (redirectGuardRef.current) clearTimeout(redirectGuardRef.current);
        redirectGuardRef.current = setTimeout(() => {
          setLoading(false);
          setLoadingProvider(null);
          setError(
            'Sign-in did not open correctly. Please try again. If this is Android, open in Chrome and retry.',
          );
        }, 12000);
        window.location.assign(data.url);
      } else {
        setError(
          "Sign-in couldn't start because the redirect URL is missing. Please contact support.",
        );
        setLoading(false);
        setLoadingProvider(null);
      }
    } catch (err) {
      const raw = getErrorMessage(err, 'Authentication failed');
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
    <Box sx={{ width: '100%', minWidth: 0, overflow: 'visible' }}>
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
        <Stack spacing={2}>
          <Box>
            <Typography component="h1" variant="h5" sx={signupStepLabel}>
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
            sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
          >
            Before entering, please confirm:
          </Typography>
          <Stack spacing={0.25} sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={loading}
                />
              }
              label={
                <Typography variant="body2" component="span" sx={{ m: 0 }}>
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
                <Typography variant="body2" component="span" sx={{ m: 0 }}>
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

          <Box
            sx={{
              ...identityStepOAuthNote,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.25,
              py: 1,
              px: 1.5,
              bgcolor: 'rgba(0, 200, 255, 0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderLeft: '4px solid #4ade80',
              borderRadius: '8px',
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'rgba(74, 222, 128, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '1rem',
              }}
              aria-hidden
            >
              🔒
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                minWidth: 0,
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'rgba(255,255,255,0.95)',
                }}
              >
                Secure OAuth authentication
              </Typography>
              <Typography
                component="span"
                sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}
              >
                We never store your credentials.
              </Typography>
            </Box>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
        </Stack>
      </Paper>
    </Box>
  );
};

export default IdentityStep;

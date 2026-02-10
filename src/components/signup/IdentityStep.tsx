import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { useSignup } from '../../context/useSignup';
import { signInWithOAuth } from '../../lib/signInWithOAuth';
import { supabase } from '../../lib/supabaseClient';
import type { IdentityProvider } from '../../types/signup';
import { POLICY_VERSION } from '../../types/signup';
import './IdentityStep.css';
import './signup.css';

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
  const [providerAnchor, setProviderAnchor] = useState<HTMLElement | null>(
    null,
  );

  const hasCheckedAuth = useRef(false);
  const hasAdvanced = useRef(false);
  const signInButtonRef = useRef<HTMLButtonElement>(null);

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
        redirectTo: `${window.location.origin}/auth/callback?next=/signup`,
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
        setError(
          'Microsoft sign-in is not configured. Add SUPABASE_AZURE_CLIENT_ID and SUPABASE_AZURE_CLIENT_SECRET to your .env file, then run: supabase stop && supabase start. See supabase/README.md for details.',
        );
      } else if (msg.includes('network') || msg.includes('timeout')) {
        setError(
          `${providerLabel} sign-in is having trouble connecting. Please check your connection and try again, or choose a different provider.`,
        );
      } else {
        setError(
          `${providerLabel} could not complete sign-in. Please try again in a moment or select a different provider.`,
        );
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
          className="signupPaper identityStep"
          sx={{ bgcolor: 'transparent', border: 'none' }}
        >
          <Box className="identityStepChecking">
            <CircularProgress size={24} />
            <Typography>Checking authentication...</Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        elevation={0}
        className="signupPaper identityStep"
        sx={{ bgcolor: 'transparent', border: 'none' }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" className="signupStepLabel">
              Continue to sign in
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
          <Box>
            <Button
              ref={signInButtonRef}
              variant="outlined"
              size="large"
              fullWidth
              onClick={(e) => setProviderAnchor(e.currentTarget)}
              disabled={loading || !canProceed}
              aria-expanded={Boolean(providerAnchor)}
              aria-haspopup="menu"
              aria-controls={providerAnchor ? 'idp-menu' : undefined}
              id="idp-signin-trigger"
              startIcon={
                loadingProvider ? (
                  <CircularProgress size={20} color="inherit" />
                ) : undefined
              }
              className="IdentityStep__btn"
              sx={{
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
              }}
            >
              {loadingProvider ? 'Signing in…' : 'Sign in'}
            </Button>
            <Menu
              id="idp-menu"
              aria-labelledby="idp-signin-trigger"
              anchorEl={providerAnchor}
              open={Boolean(providerAnchor)}
              onClose={() => {
                setProviderAnchor(null);
                signInButtonRef.current?.focus();
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <MenuItem
                onClick={() => {
                  setProviderAnchor(null);
                  void handleOAuthSignIn('google');
                }}
                disabled={loading || !canProceed}
                sx={{ minWidth: 240 }}
              >
                <ListItemIcon>
                  <GoogleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Continue with Google</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setProviderAnchor(null);
                  void handleOAuthSignIn('azure');
                }}
                disabled={loading || !canProceed}
                sx={{ minWidth: 240 }}
              >
                <ListItemIcon>
                  <MicrosoftIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Continue with Microsoft</ListItemText>
              </MenuItem>
            </Menu>
          </Box>

          <Box className="identityStepInfoBox" sx={{ mt: 2 }}>
            <Typography variant="caption" className="signupStepSubtext">
              We use OAuth for secure authentication. Your credentials are never
              stored on our servers.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={loading}
            className="signupBackButton"
            sx={{
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

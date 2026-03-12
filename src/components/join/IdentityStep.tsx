import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useJoin } from '../../context/useJoin';
import {
  getErrorMessage,
  toMessage,
  MICROSOFT_SIGNIN_NOT_CONFIGURED,
} from '../../lib/utils/errors';
import { signInWithOAuth } from '../../lib/auth/signInWithOAuth';
import { supabase } from '../../lib/auth/supabaseClient';
import { getSessionWithTimeout } from '../../lib/auth/getSessionWithTimeout';
import { useOAuthReturnReset } from '../../lib/auth/useOAuthReturnReset';
import type { IdentityProvider } from '../../types/join';
import {
  identityStepChecking,
  signupPaper,
  signupStepLabel,
  signupStepSubtext,
} from '../../theme/joinStyles';
import { POLICY_VERSION } from '../../types/join';
import { IdentityConsentSection } from './identity/IdentityConsentSection';
import { IdentityOAuthActions } from './identity/IdentityOAuthActions';

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

  const advanceFromSession = useCallback(
    (
      session: Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >['data']['session'],
    ) => {
      if (
        !session?.user ||
        hasAdvanced.current ||
        !state.completedSteps.includes('welcome')
      ) {
        return false;
      }

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

      window.setTimeout(() => {
        markComplete('identity');
        goToStep('values');
      }, 0);
      return true;
    },
    [goToStep, markComplete, setIdentity, state.completedSteps],
  );

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
        } = await getSessionWithTimeout();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setCheckingAuth(false);
          return;
        }

        if (advanceFromSession(session)) {
          console.log('Session found, advancing to values step');
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    void checkAuthentication();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (advanceFromSession(session)) {
        setCheckingAuth(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [advanceFromSession]);

  useEffect(() => {
    return () => {
      if (redirectGuardRef.current) {
        clearTimeout(redirectGuardRef.current);
      }
    };
  }, []);

  useOAuthReturnReset({
    loading,
    reset: () => {
      if (redirectGuardRef.current) {
        clearTimeout(redirectGuardRef.current);
        redirectGuardRef.current = null;
      }
      setLoading(false);
      setLoadingProvider(null);
    },
  });

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

          <IdentityConsentSection
            termsAccepted={termsAccepted}
            guidelinesAccepted={guidelinesAccepted}
            loading={loading}
            onTermsAcceptedChange={setTermsAccepted}
            onGuidelinesAcceptedChange={setGuidelinesAccepted}
          />
          <IdentityOAuthActions
            canProceed={canProceed}
            loading={loading}
            loadingProvider={loadingProvider}
            onSignIn={(provider) => void handleOAuthSignIn(provider)}
          />
        </Stack>
      </Paper>
    </Box>
  );
};

export default IdentityStep;

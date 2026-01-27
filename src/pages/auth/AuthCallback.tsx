import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { supabase } from '../../lib/supabaseClient';

// Keep this in sync with SignupProvider.tsx
const SIGNUP_STORAGE_KEY = 'wrdlnkdn-signup';

type PersistedSignupState = {
  currentStep?: string;
  completedSteps?: string[];
  identity?: {
    provider: 'google' | 'microsoft';
    userId: string;
    email: string;
    termsAccepted: boolean;
    guidelinesAccepted: boolean;
    timestamp: string;
  } | null;
  values?: unknown;
  profile?: unknown;
};

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Auth failed';
};

const safeReadSignupState = (): PersistedSignupState | null => {
  try {
    const raw = localStorage.getItem(SIGNUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSignupState;
  } catch {
    return null;
  }
};

const safeWriteSignupState = (nextState: PersistedSignupState) => {
  try {
    localStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // ignore storage write failures
  }
};

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { next, href, hasCode, oauthError } = useMemo(() => {
    const url = new URL(window.location.href);

    const nextParam = url.searchParams.get('next') || '/';
    const code = url.searchParams.get('code');

    const err =
      url.searchParams.get('error_description') ||
      url.searchParams.get('error') ||
      null;

    return {
      next: nextParam,
      href: url.toString(),
      hasCode: Boolean(code),
      oauthError: err,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        if (oauthError) throw new Error(oauthError);

        // 1) Exchange PKCE code for session (only if we have ?code=)
        if (hasCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(href);
          if (exchangeError) throw exchangeError;
        }

        // 2) Confirm session exists
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const session = sessionData.session;
        if (!session) {
          throw new Error(
            'No session created. Check provider config + redirect URLs.',
          );
        }

        // 3) Fetch user (email can be missing from session.user depending on provider)
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError) throw userError;

        const user = userData.user;
        const email =
          user.email ||
          user.user_metadata?.email ||
          user.identities?.[0]?.identity_data?.email ||
          '';

        // 4) If we have a persisted signup draft (created during IdentityStep),
        // update it with real userId/email so the signup flow can continue.
        const draft = safeReadSignupState();
        if (draft?.identity) {
          safeWriteSignupState({
            ...draft,
            identity: {
              ...draft.identity,
              userId: user.id,
              email,
              timestamp: new Date().toISOString(),
            },
          });
        }

        if (!cancelled) {
          navigate(next, { replace: true });
        }
      } catch (e: unknown) {
        if (!cancelled) setError(toMessage(e));
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [navigate, next, href, hasCode, oauthError]);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        Signing you in…
      </Typography>

      <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
        Finishing OAuth handshake and creating your session.
      </Typography>

      {error ? (
        <Alert severity="error">
          <strong>Login failed.</strong>
          <Box sx={{ mt: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {error}
          </Box>
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={22} aria-label="Signing in" />
          <Typography variant="body2">Please wait…</Typography>
        </Box>
      )}
    </Container>
  );
};

export default AuthCallback;

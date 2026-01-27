import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSignup } from '../context/useSignup';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Auth failed';
};

export const AuthCallback = () => {
  const navigate = useNavigate();
  const { setIdentity, goToStep } = useSignup();
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
        if (oauthError) {
          throw new Error(oauthError);
        }

        if (hasCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(href);
          if (exchangeError) throw exchangeError;
        }

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!sessionData.session) {
          throw new Error(
            'No session created. Check provider config and redirect URIs.',
          );
        }

        const user = sessionData.session.user;

        // Check if user has a profile
        const { error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!cancelled) {
          // If no profile exists (PGRST116 = no rows returned), continue signup
          if (profileError && profileError.code === 'PGRST116') {
            setIdentity({
              provider: 'google',
              userId: user.id,
              email: user.email || '',
              termsAccepted: true,
              guidelinesAccepted: true,
              timestamp: new Date().toISOString(),
            });
            goToStep('values');
            navigate('/signup', { replace: true });
          } else if (profileError) {
            throw profileError;
          } else {
            // Profile exists, go to intended destination
            navigate(next, { replace: true });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setError(toMessage(e));
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [navigate, next, href, hasCode, oauthError, setIdentity, goToStep]);

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
          <CircularProgress size={22} />
          <Typography variant="body2">Please wait…</Typography>
        </Box>
      )}
    </Container>
  );
};

export default AuthCallback;

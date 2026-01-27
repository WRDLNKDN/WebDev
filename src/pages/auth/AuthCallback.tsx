import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Auth failed';
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

        if (hasCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(href);
          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          throw new Error(
            'No session created. Check provider config and redirect URIs.',
          );
        }

        // ✅ Do NOT do profile checks here. Just continue.
        if (!cancelled) navigate(next, { replace: true });
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

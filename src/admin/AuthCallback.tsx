// src/pages/AuthCallback.tsx
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Auth failed';
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const next = params.get('next') || '/';

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        const url = window.location.href;
        const hasCode = url.includes('code=');

        if (hasCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(url);
          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          throw new Error(
            'No session created. Check provider config and redirect URIs.',
          );
        }

        if (!cancelled) navigate(next, { replace: true });
      } catch (e: unknown) {
        if (!cancelled) setError(toMessage(e));
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [navigate, next]);

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
          <CircularProgress size={22} aria-label="Loading..." />
          <Typography variant="body2">Please wait…</Typography>
        </Box>
      )}
    </Container>
  );
};

export default AuthCallback;

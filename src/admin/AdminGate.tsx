import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { supabase } from '../lib/supabaseClient';

type GateState = 'checking' | 'allowed' | 'denied' | 'error';

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

export const AdminGate = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<GateState>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        // Must be signed in to even attempt admin checks
        if (!sessionData.session) {
          if (!cancelled) setState('denied');
          return;
        }

        const { data, error: rpcError } = await supabase.rpc('is_admin');
        if (rpcError) throw rpcError;

        if (!cancelled) setState(data ? 'allowed' : 'denied');
      } catch (e: unknown) {
        if (!cancelled) {
          setError(toMessage(e));
          setState('error');
        }
      }
    };

    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'allowed') return <>{children}</>;

  return (
    <Box component="main" sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Typography
          component="h1"
          variant="h4"
          sx={{ fontWeight: 800 }}
          gutterBottom
        >
          Admin
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
          Admin access is restricted to allowlisted accounts.
        </Typography>

        {state === 'checking' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={22} aria-label="Checking admin access" />
            <Typography variant="body2">Checking access…</Typography>
          </Box>
        )}

        {state === 'denied' && (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              You do not have admin access.
            </Alert>

            <Typography
              variant="caption"
              sx={{ display: 'block', opacity: 0.7 }}
            >
              Admin requires a service role key and allowlist enforcement
              server-side.
            </Typography>
          </>
        )}

        {state === 'error' && (
          <Alert severity="error">
            <strong>Admin check failed.</strong>
            <Box
              sx={{ mt: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
            >
              {error ?? 'Unknown error'}
            </Box>
          </Alert>
        )}
      </Container>
    </Box>
  );
};

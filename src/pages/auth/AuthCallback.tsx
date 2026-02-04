import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSignup } from '../../context/useSignup';
import { supabase } from '../../lib/supabaseClient';
import { GLASS_CARD, SIGNUP_BG } from '../../theme/candyStyles';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setIdentity, goToStep } = useSignup();
  const [error, setError] = useState<string | null>(null);

  const next = params.get('next') || '/';

  useEffect(() => {
    let cancelled = false;

    const runSyncProtocol = async () => {
      try {
        // --- HANDSHAKE INITIALIZATION ---
        // Small delay to ensure Supabase processes the hash/query
        await new Promise((r) => setTimeout(r, 400));

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          throw new Error('No session found after OAuth handshake.');
        }

        const user = data.session.user;

        if (!cancelled) {
          // --- LOGIC BRANCH: SIGNUP VS DIRECT ENTRY ---
          if (next === '/signup') {
            setIdentity({
              provider: 'google',
              userId: user.id,
              email: user.email || '',
              termsAccepted: true,
              guidelinesAccepted: true,
              timestamp: new Date().toISOString(),
            });

            goToStep('values');

            // Brief pause to allow state to lock in
            await new Promise((r) => setTimeout(r, 200));
            navigate('/signup', { replace: true });
          } else {
            // Standard sync for dashboard, directory, or admin
            navigate(next, { replace: true });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Auth Sync Failed';
          setError(msg);
        }
      }
    };

    void runSyncProtocol();
    return () => {
      cancelled = true;
    };
  }, [navigate, next, setIdentity, goToStep]);

  return (
    <Box sx={SIGNUP_BG}>
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            ...GLASS_CARD,
            p: 6,
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <Stack spacing={4} alignItems="center">
            <CircularProgress
              size={60}
              thickness={2}
              sx={{ color: 'primary.main', mb: 2 }}
            />

            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  letterSpacing: -1,
                  mb: 1,
                  color: 'white',
                }}
              >
                {error ? '[SYNC_ERROR]' : 'Synchronizing...'}
              </Typography>

              {error ? (
                <Alert
                  severity="error"
                  variant="filled"
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  {error}
                </Alert>
              ) : (
                <Typography
                  variant="body1"
                  sx={{ opacity: 0.7, maxWidth: 300, mx: 'auto' }}
                >
                  Establishing secure handshake between Google Identity and
                  **Human OS** environment.
                </Typography>
              )}
            </Box>

            {!error && (
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  opacity: 0.4,
                  letterSpacing: 2,
                }}
              >
                VERIFYING_AUTH_TOKEN_SECTOR_01
              </Typography>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthCallback;

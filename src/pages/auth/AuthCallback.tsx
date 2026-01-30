// src/pages/auth/AuthCallback.tsx
import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Container,
  Typography,
  Alert,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useSignup } from '../../context/useSignup';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setIdentity, goToStep } = useSignup();
  const [error, setError] = useState<string | null>(null);

  const next = params.get('next') || '/';

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        console.log('🔵 AuthCallback: Starting');
        console.log('🔵 AuthCallback: next parameter =', next);
        console.log('🔵 AuthCallback: Full URL =', window.location.href);

        // Give Supabase time to process hash/query
        await new Promise((r) => setTimeout(r, 200));

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          throw new Error('No session found after OAuth redirect');
        }

        console.log('✅ AuthCallback: Session found', data.session.user.id);

        const user = data.session.user;

        if (!cancelled) {
          console.log('🔍 AuthCallback: Checking next parameter:', next);
          console.log(
            '🔍 AuthCallback: next === "/signup"?',
            next === '/signup',
          );

          // ONLY setup signup flow if explicitly coming from /signup
          if (next === '/signup') {
            console.log('📝 AuthCallback: Setting up signup flow');

            setIdentity({
              provider: 'google',
              userId: user.id,
              email: user.email || '',
              termsAccepted: true,
              guidelinesAccepted: true,
              timestamp: new Date().toISOString(),
            });

            goToStep('values');

            // Small delay to ensure state updates
            await new Promise((r) => setTimeout(r, 100));

            console.log('📍 AuthCallback: Navigating to /signup');
            navigate('/signup', { replace: true });
          } else {
            // For all other destinations (admin, directory, home), just redirect
            console.log('👤 AuthCallback: Redirecting to', next);
            navigate(next, { replace: true });
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error('❌ AuthCallback error:', e);
          setError(e instanceof Error ? e.message : 'Auth failed');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, next, setIdentity, goToStep]);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        Signing you in…
      </Typography>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={22} />
          <Typography>Please wait…</Typography>
        </Box>
      )}
    </Container>
  );
};

export default AuthCallback;

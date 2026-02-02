// src/pages/auth/AuthCallback.tsx
import {
    Alert,
    Box,
    CircularProgress,
    Container,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSignup } from '../../context/useSignup';
import { supabase } from '../../lib/supabaseClient';
import type { IdentityProvider } from '../../types/signup';

function mapSupabaseProvider(
  user: { identities?: { provider?: string }[]; app_metadata?: { provider?: string } },
): IdentityProvider {
  const p =
    user.identities?.[0]?.provider ?? user.app_metadata?.provider ?? 'google';
  return p === 'azure' ? 'microsoft' : 'google';
}

/** Check URL for OAuth error params (from hash or query) */
function getOAuthError(): string | null {
  const hash = window.location.hash?.slice(1);
  const params = new URLSearchParams(hash || window.location.search);
  return params.get('error_description') || params.get('error') || null;
}

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
        const oauthError = getOAuthError();
        if (oauthError) {
          const lower = oauthError.toLowerCase();
          if (lower.includes('provider') && lower.includes('not enabled')) {
            throw new Error(
              'Microsoft sign-in is not configured. Add SUPABASE_AZURE_CLIENT_ID and SUPABASE_AZURE_CLIENT_SECRET to your .env, then run: supabase stop && supabase start. See supabase/README.md.',
            );
          }
          throw new Error(
            `Sign-in failed: ${oauthError}. Try again or use a different sign-in method.`,
          );
        }

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

            const provider = mapSupabaseProvider(user);

            setIdentity({
              provider,
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

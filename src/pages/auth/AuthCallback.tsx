// src/pages/auth/AuthCallback.tsx
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSignup } from '../../context/useSignup';
import { toMessage, MICROSOFT_SIGNIN_NOT_CONFIGURED } from '../../lib/errors';
import { isProfileOnboarded } from '../../lib/profileOnboarding';
import { setProfileValidated } from '../../lib/profileValidatedCache';
import { supabase } from '../../lib/supabaseClient';
import type { IdentityProvider } from '../../types/signup';
import { POLICY_VERSION } from '../../types/signup';
import { updateLastActive } from '../../lib/updateLastActive';
import { GLASS_CARD, SIGNUP_BG } from '../../theme/candyStyles';

function mapSupabaseProvider(user: {
  identities?: { provider?: string }[];
  app_metadata?: { provider?: string };
}): IdentityProvider {
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

  // Default post-login destination: Feed
  const next = params.get('next') || '/feed';

  useEffect(() => {
    let cancelled = false;

    const runSyncProtocol = async () => {
      try {
        const oauthError = getOAuthError();
        if (oauthError) {
          const lower = oauthError.toLowerCase();
          if (lower.includes('provider') && lower.includes('not enabled')) {
            throw new Error(MICROSOFT_SIGNIN_NOT_CONFIGURED);
          }
          throw new Error(
            `Sign-in failed: ${oauthError}. Try again or use a different sign-in method.`,
          );
        }

        console.log('🔵 AuthCallback: Starting');
        console.log('🔵 AuthCallback: next parameter =', next);
        console.log('🔵 AuthCallback: Full URL =', window.location.href);

        // Give Supabase time to process hash/query (UAT can be slower)
        await new Promise((r) => setTimeout(r, 400));

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          throw new Error('No session found after OAuth handshake.');
        }

        const user = data.session.user;
        void updateLastActive(supabase, user.id);

        if (!cancelled) {
          // --- LOGIC BRANCH: SIGNUP VS DIRECT ENTRY ---
          if (next === '/join' || next === '/signup') {
            console.log('📝 AuthCallback: Setting up Join flow');

            const provider = mapSupabaseProvider(user);

            setIdentity({
              provider,
              userId: user.id,
              email: user.email || '',
              termsAccepted: true,
              guidelinesAccepted: true,
              policyVersion: POLICY_VERSION,
              timestamp: new Date().toISOString(),
            });

            goToStep('values');

            await new Promise((r) => setTimeout(r, 200));
            navigate('/join', { replace: true });
          } else {
            // Destinations that require onboarding: check profile before sending
            const needsOnboarding =
              next === '/feed' ||
              next === '/dashboard' ||
              next === '/' ||
              next === '/home';
            if (needsOnboarding) {
              // Fetch profile; retry once after short delay (helps with post-OAuth timing on UAT)
              const fetchProfile = async () => {
                const { data, error } = await supabase
                  .from('profiles')
                  .select(
                    'display_name, join_reason, participation_style, policy_version',
                  )
                  .eq('id', user.id)
                  .maybeSingle();
                if (error) {
                  console.warn('AuthCallback: profile fetch error', error);
                  return { data: null, error };
                }
                return { data, error: null };
              };

              let { data: profile } = await fetchProfile();
              if (!profile) {
                await new Promise((r) => setTimeout(r, 600));
                if (cancelled) return;
                ({ data: profile } = await fetchProfile());
              }
              if (!profile) {
                await new Promise((r) => setTimeout(r, 800));
                if (cancelled) return;
                ({ data: profile } = await fetchProfile());
              }
              if (cancelled) return;
              if (!isProfileOnboarded(profile)) {
                const provider = mapSupabaseProvider(user);
                setIdentity({
                  provider,
                  userId: user.id,
                  email: user.email || '',
                  termsAccepted: true,
                  guidelinesAccepted: true,
                  policyVersion: POLICY_VERSION,
                  timestamp: new Date().toISOString(),
                });
                goToStep('values');
                await new Promise((r) => setTimeout(r, 200));
                navigate('/join', { replace: true });
                return;
              }
              // Pass validated profile so RequireOnboarded skips redundant fetch.
              // Also cache in sessionStorage (survives Vercel navigation quirks where state can be lost).
              setProfileValidated(user.id, profile);
              navigate(next, {
                replace: true,
                state: { profileValidated: profile },
              });
              return;
            }
            navigate(next, { replace: true });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '';

          if (
            msg.toLowerCase().includes('network') ||
            msg.toLowerCase().includes('timeout')
          ) {
            setError(
              'We had trouble completing sign-in due to a network issue. You can try again or return home.',
            );
          } else {
            setError(toMessage(e));
          }
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
                <>
                  <Alert
                    severity="error"
                    variant="filled"
                    sx={{ mt: 2, borderRadius: 2, mb: 2 }}
                  >
                    {error}
                  </Alert>
                  <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    sx={{ mt: 1 }}
                  >
                    <Button
                      variant="contained"
                      onClick={() =>
                        navigate(
                          next === '/join' || next === '/signup'
                            ? '/join'
                            : '/signin',
                          {
                            replace: true,
                          },
                        )
                      }
                    >
                      Try again
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/', { replace: true })}
                    >
                      Back home
                    </Button>
                  </Stack>
                </>
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

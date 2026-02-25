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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useJoin } from '../../context/useJoin';
import {
  getErrorMessage,
  toMessage,
  MICROSOFT_SIGNIN_NOT_CONFIGURED,
} from '../../lib/utils/errors';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import { setProfileValidated } from '../../lib/profile/profileValidatedCache';
import { supabase } from '../../lib/auth/supabaseClient';
import type { IdentityProvider } from '../../types/join';
import { POLICY_VERSION } from '../../types/join';
import { updateLastActive } from '../../lib/utils/updateLastActive';
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
  const { setIdentity, goToStep } = useJoin();
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [startedAtMs] = useState(() => Date.now());
  const logSentRef = useRef(false);
  const providerForLogRef = useRef<'google' | 'microsoft' | 'unknown'>(
    'unknown',
  );

  // Default post-login destination: Feed
  const next = params.get('next') || '/feed';
  const appEnv =
    (import.meta.env.VITE_APP_ENV as string | undefined)
      ?.trim()
      .toLowerCase() || 'dev';
  const callbackTimeoutMs = /android/i.test(navigator.userAgent)
    ? 20000
    : 30000;

  const buildDebugInfo = () => {
    const elapsedMs = Date.now() - startedAtMs;
    return [
      `event=auth_callback_error`,
      `next=${next}`,
      `timed_out=${timedOut}`,
      `timeout_ms=${callbackTimeoutMs}`,
      `provider=${providerForLogRef.current}`,
      `app_env=${appEnv}`,
      `elapsed_ms=${elapsedMs}`,
      `url=${window.location.href}`,
      `user_agent=${navigator.userAgent}`,
      `error=${error ?? 'none'}`,
      `timestamp=${new Date().toISOString()}`,
    ].join('\n');
  };

  const copyDebugInfo = async () => {
    const payload = buildDebugInfo();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const ta = document.createElement('textarea');
        ta.value = payload;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopyStatus('Debug info copied.');
    } catch {
      setCopyStatus(
        'Could not copy automatically. Please screenshot this page.',
      );
    }
  };

  const postAuthCallbackLog = useCallback(() => {
    if (logSentRef.current) return;
    logSentRef.current = true;
    const payload = {
      event: 'auth_callback_error',
      next,
      timed_out: timedOut,
      timeout_ms: callbackTimeoutMs,
      provider: providerForLogRef.current,
      app_env: appEnv,
      elapsed_ms: Date.now() - startedAtMs,
      url: window.location.href,
      user_agent: navigator.userAgent,
      error: error ?? 'none',
      timestamp: new Date().toISOString(),
    };
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/auth/callback-log', blob);
        return;
      }
    } catch {
      // Fall through to fetch keepalive path.
    }
    void fetch('/api/auth/callback-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Intentionally swallow diagnostics failures.
    });
  }, [appEnv, callbackTimeoutMs, error, next, startedAtMs, timedOut]);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setTimedOut(true);
      setError(
        'Sign-in is taking longer than expected. Please try again. On Android, opening in Chrome usually fixes this.',
      );
    }, callbackTimeoutMs);

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

        // Give Supabase time to exchange code and establish session (UAT/slow networks)
        await new Promise((r) => setTimeout(r, 600));

        let { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          await new Promise((r) => setTimeout(r, 400));
          ({ data, error: sessionError } = await supabase.auth.getSession());
          if (sessionError) throw sessionError;
        }
        if (!data.session) {
          throw new Error('No session found after OAuth handshake.');
        }

        const user = data.session.user;
        providerForLogRef.current = mapSupabaseProvider(user);
        void updateLastActive(supabase, user.id);

        if (!cancelled) {
          // --- LOGIC BRANCH: SIGNUP VS DIRECT ENTRY ---
          if (next === '/join') {
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
                await new Promise((r) => setTimeout(r, 800));
                if (cancelled) return;
                ({ data: profile } = await fetchProfile());
              }
              if (!profile) {
                await new Promise((r) => setTimeout(r, 1000));
                if (cancelled) return;
                ({ data: profile } = await fetchProfile());
              }
              if (cancelled) return;

              if (profile) {
                console.log(
                  '🔵 AuthCallback: profile fetched',
                  !!profile.display_name,
                  !!profile.join_reason?.length,
                  !!profile.participation_style?.length,
                );
              } else {
                console.warn(
                  '🔵 AuthCallback: profile fetch returned null after retries → sending to /join',
                );
              }

              if (!profile || !isProfileOnboarded(profile)) {
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
          const msg = getErrorMessage(e);

          if (
            msg.toLowerCase().includes('network') ||
            msg.toLowerCase().includes('timeout')
          ) {
            setError(
              'We had trouble completing sign-in due to a network issue. You can try again or return home.',
            );
          } else if (msg.toLowerCase().includes('no session found')) {
            setError(
              'Sign-in did not complete on this device. Please try again. On Android, opening in Chrome usually fixes this.',
            );
          } else {
            setError(toMessage(e));
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    void runSyncProtocol();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [callbackTimeoutMs, navigate, next, setIdentity, goToStep]);

  useEffect(() => {
    if (!error) return;
    postAuthCallbackLog();
  }, [error, postAuthCallbackLog]);

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
                    sx={{ mt: 1, flexWrap: 'wrap' }}
                  >
                    <Button
                      variant="contained"
                      onClick={() => navigate('/join', { replace: true })}
                    >
                      Try again
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/', { replace: true })}
                    >
                      Back home
                    </Button>
                    <Button variant="text" onClick={() => void copyDebugInfo()}>
                      Copy debug info
                    </Button>
                  </Stack>
                  {copyStatus && (
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                      {copyStatus}
                    </Typography>
                  )}
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

            {!error && !timedOut && (
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

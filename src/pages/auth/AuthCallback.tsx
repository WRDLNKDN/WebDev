import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useJoin } from '../../context/useJoin';
import {
  getErrorMessage,
  MICROSOFT_SIGNIN_NOT_CONFIGURED,
} from '../../lib/utils/errors';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import { setProfileValidated } from '../../lib/profile/profileValidatedCache';
import { supabase } from '../../lib/auth/supabaseClient';
import { POLICY_VERSION } from '../../types/join';
import { updateLastActive } from '../../lib/utils/updateLastActive';
import { SIGNUP_BG } from '../../theme/candyStyles';
import { devLog, devWarn } from '../../lib/utils/devLog';
import {
  buildAuthCallbackLogPayload,
  copyAuthCallbackDebugPayload,
  getOAuthError,
  mapSupabaseProvider,
  sendAuthCallbackLog,
} from './authCallbackDiagnostics';
import { getAuthCallbackDisplayError } from './authCallbackErrors';
import { AuthCallbackStatusCard } from './components/AuthCallbackStatusCard';
import { useAuthCallbackFallbackRedirect } from './useAuthCallbackFallbackRedirect';

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

  const next =
    params.get('next') ||
    new URLSearchParams(window.location.search).get('next') ||
    '/feed';
  const authCode =
    params.get('code') ||
    new URLSearchParams(window.location.search).get('code');
  const appEnv =
    (import.meta.env.VITE_APP_ENV as string | undefined)
      ?.trim()
      .toLowerCase() || 'dev';
  const callbackTimeoutMs = /android/i.test(navigator.userAgent)
    ? 16000
    : 12000;

  const copyDebugInfo = async () => {
    if (
      await copyAuthCallbackDebugPayload({
        startedAtMs,
        next,
        timedOut,
        timeoutMs: callbackTimeoutMs,
        provider: providerForLogRef.current,
        appEnv,
        error,
      })
    ) {
      setCopyStatus('Debug info copied.');
    } else {
      setCopyStatus(
        'Could not copy automatically. Please screenshot this page.',
      );
    }
  };

  const postAuthCallbackLog = useCallback(() => {
    if (logSentRef.current) return;
    logSentRef.current = true;
    const payload = buildAuthCallbackLogPayload({
      next,
      timedOut,
      timeoutMs: callbackTimeoutMs,
      provider: providerForLogRef.current,
      appEnv,
      startedAtMs,
      error,
    });
    sendAuthCallbackLog(payload);
  }, [appEnv, callbackTimeoutMs, error, next, startedAtMs, timedOut]);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const fetchSession = async () => supabase.auth.getSession();
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

        devLog('🔵 AuthCallback: Starting');
        devLog('🔵 AuthCallback: next parameter =', next);
        devLog('🔵 AuthCallback: Full URL =', window.location.href);

        let session = null;
        if (authCode) {
          devLog('🔵 AuthCallback: Exchanging auth code');
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) throw exchangeError;
        }

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const { data, error } = await fetchSession();
          if (error) throw error;
          if (data.session) {
            session = data.session;
            break;
          }
          if (attempt < 2) {
            await sleep(120);
          }
        }
        if (!session) {
          throw new Error('No session found after OAuth handshake.');
        }

        const user = session.user;
        providerForLogRef.current = mapSupabaseProvider(user);
        void updateLastActive(supabase, user.id);

        if (!cancelled) {
          if (next === '/join') {
            devLog('📝 AuthCallback: Setting up Join flow');

            const fetchProfile = async () => {
              const { data, error } = await supabase
                .from('profiles')
                .select(
                  'display_name, join_reason, participation_style, policy_version',
                )
                .eq('id', user.id)
                .maybeSingle();
              return { data, error };
            };

            let profile = null;
            let profileError = null;
            for (let attempt = 0; attempt < 2; attempt += 1) {
              const result = await fetchProfile();
              profile = result.data;
              profileError = result.error;
              if (profile || profileError) break;
              if (attempt < 1) {
                await sleep(120);
                if (cancelled) return;
              }
            }

            if (profile && isProfileOnboarded(profile)) {
              setProfileValidated(user.id, profile);
              navigate('/feed', {
                replace: true,
                state: { profileValidated: profile },
              });
              return;
            }

            if (profileError) {
              navigate('/feed', { replace: true });
              return;
            }

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
            navigate('/join', { replace: true });
          } else {
            const needsOnboarding =
              next === '/feed' ||
              next === '/dashboard' ||
              next === '/' ||
              next === '/home';
            if (needsOnboarding) {
              const fetchProfile = async () => {
                const { data, error } = await supabase
                  .from('profiles')
                  .select(
                    'display_name, join_reason, participation_style, policy_version',
                  )
                  .eq('id', user.id)
                  .maybeSingle();
                if (error) {
                  devWarn('AuthCallback: profile fetch error', error);
                  return { data: null, error };
                }
                return { data, error: null };
              };

              let profile = null;
              let profileError = null;
              for (let attempt = 0; attempt < 2; attempt += 1) {
                const result = await fetchProfile();
                profile = result.data;
                profileError = result.error;
                if (profile || profileError) break;
                if (attempt < 1) {
                  await sleep(120);
                  if (cancelled) return;
                }
              }
              if (cancelled) return;

              if (profile) {
                devLog(
                  '🔵 AuthCallback: profile fetched',
                  !!profile.display_name,
                  !!profile.join_reason?.length,
                  !!profile.participation_style?.length,
                );
              } else {
                devWarn(
                  '🔵 AuthCallback: profile fetch returned null after retries → sending to /join',
                );
              }

              if (!profile && profileError) {
                devWarn(
                  '🔵 AuthCallback: profile read error; continuing to protected route',
                  profileError,
                );
                navigate(next, { replace: true });
                return;
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
                navigate('/join', { replace: true });
                return;
              }
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
          setError(getAuthCallbackDisplayError(getErrorMessage(e)));
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
  }, [authCode, callbackTimeoutMs, navigate, next, setIdentity, goToStep]);

  useAuthCallbackFallbackRedirect(next);

  useEffect(() => {
    if (!error) return;
    postAuthCallbackLog();
  }, [error, postAuthCallbackLog]);

  if (!error) {
    return (
      <Box
        sx={{
          ...SIGNUP_BG,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Stack
            spacing={2}
            alignItems="center"
            sx={{ color: '#FFFFFF', textAlign: 'center' }}
          >
            <CircularProgress
              size={40}
              thickness={4}
              sx={{ color: 'primary.main' }}
              aria-label="Authorization in progress"
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Authorization in Progress
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Connecting your account. Please wait.
            </Typography>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={SIGNUP_BG}>
      <Container maxWidth="sm">
        <AuthCallbackStatusCard
          error={error}
          timedOut={timedOut}
          copyStatus={copyStatus}
          onTryAgain={() => navigate('/join', { replace: true })}
          onBackHome={() => navigate('/', { replace: true })}
          onCopyDebugInfo={() => {
            void copyDebugInfo();
          }}
        />
      </Container>
    </Box>
  );
};

export default AuthCallback;

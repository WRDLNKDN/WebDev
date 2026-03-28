import { Box, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import type { ProfileOnboardingCheck } from '../../lib/profile/profileOnboarding';
import {
  getProfileValidated,
  hasProfileOnboardedSticky,
  setProfileValidated,
} from '../../lib/profile/profileValidatedCache';
import { consumeSignOutRedirect } from '../../lib/auth/signOut';
import { getSessionWithTimeout } from '../../lib/auth/getSessionWithTimeout';
import { supabase } from '../../lib/auth/supabaseClient';
import { devLog, devWarn } from '../../lib/utils/devLog';

type State = 'loading' | 'redirect' | 'allowed';
const ENFORCED_INACTIVE_STATUSES = new Set(['disabled', 'suspended', 'banned']);
const SESSION_RETRY_DELAYS_MS = [400, 400];
const FINAL_SESSION_GRACE_DELAY_MS = 900;
const PROFILE_RETRY_DELAYS_MS = [0, 600, 800];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadOnboardingProfile(userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'display_name, join_reason, participation_style, policy_version, status',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    devWarn('❌ RequireOnboarded: Profile fetch error:', error);
  }

  return { profile, error };
}

function shouldAllowThroughProfileError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
) {
  if (!error) {
    return false;
  }
  return (
    error.code === 'PGRST116' ||
    error.code === '42501' ||
    /permission denied/i.test(error.message ?? '')
  );
}

/**
 * Route guard: requires auth AND completed profile (onboarding).
 * Redirects to /join when not signed in or profile incomplete.
 * When coming from AuthCallback with profileValidated in state, trust it to avoid feed→join flicker.
 */
export const RequireOnboarded = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const location = useLocation();

  // Sync: AuthCallback passed profile in location.state — allow through without fetch
  const validated = location.state as
    | { profileValidated?: ProfileOnboardingCheck }
    | undefined;
  const hasValidatedFromState =
    validated?.profileValidated &&
    isProfileOnboarded(validated.profileValidated);
  const [state, setState] = useState<State>(
    hasValidatedFromState ? 'allowed' : 'loading',
  );
  const hasEverAllowedRef = useRef<boolean>(Boolean(hasValidatedFromState));
  const checkRunRef = useRef(0);
  /** No session → /; not onboarded → /join */
  const redirectToRef = useRef<'/' | '/join'>('/join');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const runId = ++checkRunRef.current;
      const isCurrentRun = () => !cancelled && runId === checkRunRef.current;
      let { data } = await getSessionWithTimeout();

      for (const delayMs of SESSION_RETRY_DELAYS_MS) {
        if (data.session || !isCurrentRun()) {
          break;
        }
        await sleep(delayMs);
        if (!isCurrentRun()) return;
        ({ data } = await getSessionWithTimeout());
      }
      if (!isCurrentRun()) return;

      if (!data.session) {
        // Try one explicit refresh before redirecting. UAT can briefly return null
        // sessions while token refresh is in-flight.
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!isCurrentRun()) return;
        if (refreshed.session) {
          data = refreshed;
        }
      }

      if (!data.session) {
        // If we've already validated access for this mounted route, do not
        // downgrade to redirect on a transient auth hydration miss.
        if (hasEverAllowedRef.current) {
          setState('allowed');
          return;
        }
        // Final hydration grace pass before redirecting on fresh OAuth landings.
        await sleep(FINAL_SESSION_GRACE_DELAY_MS);
        if (!isCurrentRun()) return;
        const { data: recheck } = await getSessionWithTimeout();
        if (recheck.session) {
          data = recheck;
        } else {
          const { data: refreshedFinal } = await supabase.auth.refreshSession();
          if (refreshedFinal.session) data = refreshedFinal;
        }
      }

      if (!data.session) {
        devLog('🔴 RequireOnboarded: No session found after grace check');
        redirectToRef.current = '/';
        setState('redirect');
        return;
      }

      const userId = data.session.user.id;
      devLog('🔵 RequireOnboarded: Session found for user', userId);

      // sessionStorage fallback (Vercel: location.state can be lost during navigation)
      const cached = getProfileValidated(userId);
      const hasStickyOnboarded = hasProfileOnboardedSticky(userId);
      if (cached && isProfileOnboarded(cached)) {
        devLog('✅ RequireOnboarded: Using cached profile');
        hasEverAllowedRef.current = true;
        setState('allowed');
        return;
      }

      let profile: ProfileOnboardingCheck | null = null;
      let error: { code?: string | null; message?: string | null } | null =
        null;

      for (const [attemptIndex, delayMs] of PROFILE_RETRY_DELAYS_MS.entries()) {
        if (delayMs > 0) {
          await sleep(delayMs);
          if (!isCurrentRun()) return;
        }
        const result = await loadOnboardingProfile(userId);
        profile = result.profile;
        error = result.error;
        devLog(`🔍 RequireOnboarded: Fetch attempt ${attemptIndex + 1}`, {
          profile,
          error,
        });
        if (profile) {
          break;
        }
      }

      if (!isCurrentRun()) return;

      // If profile reads are blocked during deploy/policy churn, do not trap
      // existing members in a feed->join loop.
      if (shouldAllowThroughProfileError(error)) {
        devWarn('⚠️ RequireOnboarded: profile read blocked - allowing through');
        hasEverAllowedRef.current = true;
        setState('allowed');
        return;
      }

      if (!profile) {
        if (hasStickyOnboarded) {
          // Known onboarded member + transient profile miss: keep route stable.
          hasEverAllowedRef.current = true;
          setState('allowed');
          return;
        }
        if (hasEverAllowedRef.current) {
          // Keep current authorized view if this is a transient profile read miss.
          setState('allowed');
          return;
        }
        devLog(
          '🔴 RequireOnboarded: No profile after 3 attempts, redirecting to /join',
        );
        redirectToRef.current = '/join';
        setState('redirect');
        return;
      }

      devLog('🔍 RequireOnboarded: Profile data', {
        displayName: profile.display_name,
        joinReason: profile.join_reason,
        participationStyle: profile.participation_style,
        status: profile.status,
        isOnboarded: isProfileOnboarded(profile),
      });

      if (
        typeof profile.status === 'string' &&
        ENFORCED_INACTIVE_STATUSES.has(profile.status)
      ) {
        await supabase.auth.signOut({ scope: 'global' });
        hasEverAllowedRef.current = false;
        redirectToRef.current = '/';
        setState('redirect');
        return;
      }

      // Any profiles row → app shell (finish fields in settings if needed).
      devLog('✅ RequireOnboarded: Profile row found, allowing through', {
        isOnboarded: isProfileOnboarded(profile),
      });
      setProfileValidated(userId, profile);
      hasEverAllowedRef.current = true;
      setState('allowed');
    };

    void check();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        // UAT hardening: SIGNED_OUT can be emitted transiently during token
        // churn. Re-verify/refresh before forcing redirect.
        void (async () => {
          const { data: current } = await getSessionWithTimeout();
          if (cancelled) return;
          if (current.session) {
            void check();
            return;
          }
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (cancelled) return;
          if (refreshed.session) {
            void check();
            return;
          }
          hasEverAllowedRef.current = false;
          redirectToRef.current =
            (consumeSignOutRedirect() as '/' | '/join' | null) ?? '/';
          setState('redirect');
        })();
        return;
      }
      // Ignore transient null sessions after we've already allowed this route.
      if (!session && hasEverAllowedRef.current) {
        return;
      }
      void check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '40vh',
        }}
      >
        <CircularProgress aria-label="Checking authentication and profile" />
      </Box>
    );
  }

  if (state === 'redirect') {
    return (
      <Navigate to={redirectToRef.current} replace state={{ from: location }} />
    );
  }

  return <>{children}</>;
};

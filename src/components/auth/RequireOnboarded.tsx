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
import { supabase } from '../../lib/auth/supabaseClient';
import { devLog, devWarn } from '../../lib/utils/devLog';

type State = 'loading' | 'redirect' | 'allowed';
const ENFORCED_INACTIVE_STATUSES = new Set(['disabled', 'suspended', 'banned']);

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
      // Retry getSession: after OAuth redirect, session can be briefly unready (Vercel/timing)
      let { data } = await supabase.auth.getSession();
      if (!data.session) {
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;
        ({ data } = await supabase.auth.getSession());
      }
      if (!data.session) {
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;
        ({ data } = await supabase.auth.getSession());
      }
      if (cancelled || runId !== checkRunRef.current) return;

      if (!data.session) {
        // Try one explicit refresh before redirecting. UAT can briefly return null
        // sessions while token refresh is in-flight.
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (cancelled || runId !== checkRunRef.current) return;
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
        await new Promise((r) => setTimeout(r, 900));
        if (cancelled || runId !== checkRunRef.current) return;
        const { data: recheck } = await supabase.auth.getSession();
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

      const fetchProfile = async () => {
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
      };

      let result = await fetchProfile();
      let profile = result.profile;
      let error = result.error;

      devLog('🔍 RequireOnboarded: Fetch attempt 1', { profile, error });

      if (!profile) {
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        result = await fetchProfile();
        profile = result.profile;
        error = result.error;
        devLog('🔍 RequireOnboarded: Fetch attempt 2', { profile, error });
      }
      if (!profile) {
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;
        result = await fetchProfile();
        profile = result.profile;
        error = result.error;
        devLog('🔍 RequireOnboarded: Fetch attempt 3', { profile, error });
      }

      if (cancelled || runId !== checkRunRef.current) return;

      // If profile reads are blocked during deploy/policy churn, do not trap
      // existing members in a feed->join loop.
      if (
        error &&
        (error.code === 'PGRST116' ||
          error.code === '42501' ||
          /permission denied/i.test(error.message ?? ''))
      ) {
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

      if (!isProfileOnboarded(profile)) {
        devLog('🔴 RequireOnboarded: Profile not onboarded');
        redirectToRef.current = '/join';
        setState('redirect');
        return;
      }

      devLog('✅ RequireOnboarded: Profile valid, allowing through');
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
          const { data: current } = await supabase.auth.getSession();
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

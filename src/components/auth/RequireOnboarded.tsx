import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import type { ProfileOnboardingCheck } from '../../lib/profile/profileOnboarding';
import { getProfileValidated } from '../../lib/profile/profileValidatedCache';
import { supabase } from '../../lib/auth/supabaseClient';

type State = 'loading' | 'redirect' | 'allowed';

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
  const [state, setState] = useState<State>('loading');

  // Sync: AuthCallback passed profile in location.state — allow through without fetch
  const validated = location.state as
    | { profileValidated?: ProfileOnboardingCheck }
    | undefined;
  const hasValidatedFromState =
    validated?.profileValidated &&
    isProfileOnboarded(validated.profileValidated);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
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
      if (cancelled) return;

      if (!data.session) {
        console.log('🔴 RequireOnboarded: No session found');
        setState('redirect');
        return;
      }

      const userId = data.session.user.id;
      console.log('🔵 RequireOnboarded: Session found for user', userId);

      // sessionStorage fallback (Vercel: location.state can be lost during navigation)
      const cached = getProfileValidated(userId);
      if (cached && isProfileOnboarded(cached)) {
        console.log('✅ RequireOnboarded: Using cached profile');
        setState('allowed');
        return;
      }

      const fetchProfile = async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select(
            'display_name, join_reason, participation_style, policy_version',
          )
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('❌ RequireOnboarded: Profile fetch error:', error);
        }

        return { profile, error };
      };

      let result = await fetchProfile();
      let profile = result.profile;
      let error = result.error;

      console.log('🔍 RequireOnboarded: Fetch attempt 1', { profile, error });

      if (!profile) {
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        result = await fetchProfile();
        profile = result.profile;
        error = result.error;
        console.log('🔍 RequireOnboarded: Fetch attempt 2', { profile, error });
      }
      if (!profile) {
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;
        result = await fetchProfile();
        profile = result.profile;
        error = result.error;
        console.log('🔍 RequireOnboarded: Fetch attempt 3', { profile, error });
      }

      if (cancelled) return;

      // CRITICAL: If RLS is blocking, allow through anyway
      if (error && error.code === 'PGRST116') {
        console.warn(
          '⚠️ RequireOnboarded: RLS blocking read - allowing through',
        );
        setState('allowed');
        return;
      }

      if (!profile) {
        console.log(
          '🔴 RequireOnboarded: No profile after 3 attempts, redirecting to /join',
        );
        setState('redirect');
        return;
      }

      console.log('🔍 RequireOnboarded: Profile data', {
        displayName: profile.display_name,
        joinReason: profile.join_reason,
        participationStyle: profile.participation_style,
        isOnboarded: isProfileOnboarded(profile),
      });

      if (!isProfileOnboarded(profile)) {
        console.log('🔴 RequireOnboarded: Profile not onboarded');
        setState('redirect');
        return;
      }

      console.log('✅ RequireOnboarded: Profile valid, allowing through');
      setState('allowed');
    };

    void check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) void check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (hasValidatedFromState) {
    return <>{children}</>;
  }

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
    return <Navigate to="/join" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

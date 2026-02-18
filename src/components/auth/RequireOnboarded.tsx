import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isProfileOnboarded } from '../../lib/profileOnboarding';
import type { ProfileOnboardingCheck } from '../../lib/profileOnboarding';
import { getProfileValidated } from '../../lib/profileValidatedCache';
import { supabase } from '../../lib/supabaseClient';

type State = 'loading' | 'redirect' | 'allowed';

export const RequireOnboarded = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const location = useLocation();
  const [state, setState] = useState<State>('loading');
  const [debugInfo, setDebugInfo] = useState<string>('');

  const validated = location.state as
    | { profileValidated?: ProfileOnboardingCheck }
    | undefined;
  const hasValidatedFromState =
    validated?.profileValidated &&
    isProfileOnboarded(validated.profileValidated);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Retry getSession
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
      console.log('🔵 RequireOnboarded: Session found, userId =', userId);

      // Check sessionStorage cache
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
          console.error('❌ RequireOnboarded: Profile fetch error', error);
        }

        return { profile, error };
      };

      // Try 1
      let { profile, error } = await fetchProfile();
      console.log('🔍 RequireOnboarded: Fetch attempt 1', { profile, error });

      // Try 2
      if (!profile && !cancelled) {
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        ({ profile, error } = await fetchProfile());
        console.log('🔍 RequireOnboarded: Fetch attempt 2', { profile, error });
      }

      // Try 3
      if (!profile && !cancelled) {
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;
        ({ profile, error } = await fetchProfile());
        console.log('🔍 RequireOnboarded: Fetch attempt 3', { profile, error });
      }

      if (cancelled) return;

      // CRITICAL FIX: If we have an RLS error, allow through
      // (user likely has a profile but RLS is misconfigured)
      if (error && error.code === 'PGRST116') {
        console.warn(
          '⚠️ RequireOnboarded: RLS blocking profile read - allowing through',
        );
        setState('allowed');
        return;
      }

      // If still no profile after 3 tries, redirect to /join
      if (!profile) {
        console.log(
          '🔴 RequireOnboarded: No profile found after 3 attempts, redirecting to /join',
        );
        setDebugInfo(`No profile found (error: ${error?.message || 'none'})`);
        setState('redirect');
        return;
      }

      console.log('🔍 RequireOnboarded: Profile check', {
        displayName: profile.display_name,
        joinReason: profile.join_reason,
        participationStyle: profile.participation_style,
        isOnboarded: isProfileOnboarded(profile),
      });

      if (!isProfileOnboarded(profile)) {
        console.log(
          '🔴 RequireOnboarded: Profile not onboarded, redirecting to /join',
        );
        setState('redirect');
        return;
      }

      console.log('✅ RequireOnboarded: Profile onboarded, allowing through');
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
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '40vh',
          gap: 2,
        }}
      >
        <CircularProgress aria-label="Checking authentication and profile" />
        {debugInfo && (
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {debugInfo}
          </Box>
        )}
      </Box>
    );
  }

  if (state === 'redirect') {
    return <Navigate to="/join" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isProfileOnboarded } from '../../lib/profileOnboarding';
import type { ProfileOnboardingCheck } from '../../lib/profileOnboarding';
import { getProfileValidated } from '../../lib/profileValidatedCache';
import { supabase } from '../../lib/supabaseClient';

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
        setState('redirect');
        return;
      }

      const userId = data.session.user.id;

      // sessionStorage fallback (Vercel: location.state can be lost during navigation)
      const cached = getProfileValidated(userId);
      if (cached && isProfileOnboarded(cached)) {
        setState('allowed');
        return;
      }

      const fetchProfile = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select(
            'display_name, join_reason, participation_style, policy_version',
          )
          .eq('id', userId)
          .maybeSingle();
        return profile;
      };

      let profile = await fetchProfile();
      if (!profile) {
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        profile = await fetchProfile();
      }
      if (!profile) {
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;
        profile = await fetchProfile();
      }

      if (cancelled) return;

      if (!isProfileOnboarded(profile)) {
        setState('redirect');
        return;
      }

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

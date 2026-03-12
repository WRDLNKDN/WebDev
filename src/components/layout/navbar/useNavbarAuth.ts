import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { signOut } from '../../../lib/auth/signOut';
import { supabase } from '../../../lib/auth/supabaseClient';
import { consumeJoinCompletionFlash } from '../../../lib/profile/joinCompletionFlash';
import { isProfileOnboarded } from '../../../lib/profile/profileOnboarding';
import { toMessage } from '../../../lib/utils/errors';

type UseNavbarAuthArgs = {
  path: string;
  forcePublicHeader: boolean;
  navigate: NavigateFunction;
};

export const useNavbarAuth = ({
  path,
  forcePublicHeader,
  navigate,
}: UseNavbarAuthArgs) => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [profileOnboarded, setProfileOnboarded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setSession(data.session ?? null);
          setSessionLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setSessionLoaded(true);
        }
      }
    };

    void refreshSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt, newSession) => {
        if (!cancelled) {
          setSession(newSession ?? null);
          setSessionLoaded(true);
        }
      },
    );

    const retries = [600, 1200];
    const retryTimers = retries.map((delay) =>
      setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          if (data.session) setSession(data.session);
          setSessionLoaded(true);
        }
      }, delay),
    );

    const sessionGuardTimer = setTimeout(async () => {
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setSession(data.session ?? null);
        setSessionLoaded(true);
      }
    }, 2500);

    return () => {
      cancelled = true;
      retryTimers.forEach(clearTimeout);
      clearTimeout(sessionGuardTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkOnboarding = async () => {
      if (forcePublicHeader) {
        if (!cancelled) {
          setProfileOnboarded(false);
          setOnboardingLoaded(true);
        }
        return;
      }
      if (!session?.user?.id) {
        if (!cancelled) {
          setProfileOnboarded(false);
          setOnboardingLoaded(true);
        }
        return;
      }
      setOnboardingLoaded(false);
      try {
        const { data } = await supabase
          .from('profiles')
          .select(
            'display_name, join_reason, participation_style, policy_version',
          )
          .eq('id', session.user.id)
          .maybeSingle();
        if (!cancelled) {
          setProfileOnboarded(Boolean(data && isProfileOnboarded(data)));
          setOnboardingLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setProfileOnboarded(true);
          setOnboardingLoaded(true);
        }
      }
    };
    void checkOnboarding();

    const onboardingGuardTimer = setTimeout(() => {
      if (!cancelled) {
        setProfileOnboarded(true);
        setOnboardingLoaded(true);
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(onboardingGuardTimer);
    };
  }, [forcePublicHeader, session?.user?.id]);

  const prevPathRef = useRef(path);
  useEffect(() => {
    if (prevPathRef.current === '/auth/callback' && path !== '/auth/callback') {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setSessionLoaded(true);
        }
      })();
    }
    prevPathRef.current = path;
  }, [path]);

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      if (!session) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = (await supabase.rpc('is_admin')) as {
          data: boolean | null;
          error: Error | null;
        };
        if (cancelled) return;

        setIsAdmin(!error && data === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      setSession(null);
      navigate('/', { replace: true });
    } catch (error) {
      setSnack(toMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openJoin = useCallback(async () => {
    if (path === '/join') {
      setJoinLoading(false);
      return;
    }
    setDrawerOpen(false);
    setJoinLoading(true);
    try {
      await import('../../../pages/auth/Join');
    } finally {
      navigate('/join');
    }
  }, [navigate, path]);

  const openSignIn = useCallback(async () => {
    if (path === '/signin') return;
    setDrawerOpen(false);
    try {
      await import('../../../pages/auth/SignIn');
    } finally {
      navigate('/signin');
    }
  }, [navigate, path]);

  useEffect(() => {
    if (path === '/join') {
      setJoinLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (path === '/signin' || path === '/join') {
      setDrawerOpen(false);
    }
  }, [path]);

  useEffect(() => {
    if (path !== '/feed') return;
    if (!consumeJoinCompletionFlash()) return;
    setSnack('Your account is ready. Welcome to the Feed.');
  }, [path]);

  return {
    session,
    sessionLoaded,
    onboardingLoaded,
    profileOnboarded,
    isAdmin,
    busy,
    snack,
    setSnack,
    drawerOpen,
    setDrawerOpen,
    avatarMenuAnchor,
    setAvatarMenuAnchor,
    joinLoading,
    handleSignOut,
    openJoin,
    openSignIn,
  };
};

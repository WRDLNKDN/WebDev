import { useEffect, useRef } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { prefetchAuthedAppShellDuringIdle } from '../lib/routing/routePrefetch';

/**
 * When a session exists, schedule prefetch of common authed route chunks during idle time.
 */
export function useAuthedAppIdlePrefetch(): void {
  const ranForUserRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const maybePrefetch = (userId: string | undefined) => {
      if (!userId || cancelled) return;
      if (ranForUserRef.current === userId) return;
      ranForUserRef.current = userId;
      prefetchAuthedAppShellDuringIdle();
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      maybePrefetch(session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        maybePrefetch(session.user.id);
      } else {
        ranForUserRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
}

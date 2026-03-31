import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { supabase } from '../lib/auth/supabaseClient';

/**
 * Subscribes to Supabase auth and mirrors session into React state.
 * Set `enabled` false when the parent already supplies session (e.g. layout → popover).
 */
export function useSupabaseAuthSessionSync(
  enabled: boolean,
  setSession: (session: Session | null) => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSession(data.session ?? null);
    };
    init().catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!cancelled) setSession(s ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [enabled, setSession]);
}

import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import { updateLastActive } from '../../lib/utils/updateLastActive';

/** Session synced from Supabase for layout chrome (navbar, messenger, chat popover). */
export function useLayoutSupabaseSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSession(data.session ?? null);
    };
    void init();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!cancelled) setSession(s ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return session;
}

/** Layout owns the only vertical scroll; lock document to avoid double scrollbars. */
export function useLayoutDocumentScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflowY;
    const prevBodyOverflow = body.style.overflowY;
    html.style.overflowY = 'hidden';
    body.style.overflowY = 'hidden';
    return () => {
      html.style.overflowY = prevHtmlOverflow;
      body.style.overflowY = prevBodyOverflow;
    };
  }, []);
}

/** Best-effort last-active ping once layout mounts for signed-in members. */
export function useLayoutLastActivePing() {
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (uid) {
        await updateLastActive(supabase, uid);
      }
    })();
  }, []);
}

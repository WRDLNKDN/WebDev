import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { onNotificationsUnreadRefreshRequest } from '../lib/notifications/notificationsUnreadSync';

const REALTIME_DEBOUNCE_MS = 100;

export function useNotificationsUnread(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user?.id) {
      setCount(0);
      return;
    }
    const { count: c, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', sessionData.session.user.id)
      .is('read_at', null);
    if (!error) setCount(c ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const scheduleRefreshFromRealtime = () => {
      if (debounceTimer != null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void refresh();
      }, REALTIME_DEBOUNCE_MS);
    };

    void refresh();

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user?.id) return;

      /**
       * Unique topic per mount so React Strict Mode / HMR teardown does not reuse a
       * channel that is already subscribed (Realtime throws on .on() after subscribe).
       */
      const topic = `notifications-unread:${session.user.id}:${crypto.randomUUID()}`;
      const ch = supabase.channel(topic).on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${session.user.id}`,
        },
        () => {
          scheduleRefreshFromRealtime();
        },
      );
      ch.subscribe();
      if (cancelled) {
        void supabase.removeChannel(ch);
        return;
      }
      channel = ch;
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    const offExplicitRefresh = onNotificationsUnreadRefreshRequest(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      if (debounceTimer != null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      offExplicitRefresh();
      authSub.subscription.unsubscribe();
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [refresh]);

  return count;
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/auth/supabaseClient';

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
    const state: { channel: ReturnType<typeof supabase.channel> | null } = {
      channel: null,
    };

    const setup = async () => {
      void refresh();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const ch = supabase.channel('notifications-unread').on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${session.user.id}`,
          },
          () => {
            void refresh();
          },
        );
        ch.subscribe();
        state.channel = ch;
      }
    };

    void setup();
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      authSub.subscription.unsubscribe();
      if (state.channel) void supabase.removeChannel(state.channel);
    };
  }, [refresh]);

  return count;
}

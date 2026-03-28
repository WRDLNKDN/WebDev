import { useEffect } from 'react';
import { supabase } from '../lib/auth/supabaseClient';

export function useGameSessionRealtime(
  sessionId: string | null | undefined,
  onChange: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || !sessionId?.trim()) return;
    let active = true;
    const safeRefresh = () => {
      if (!active) return;
      onChange();
    };
    const channel = supabase
      .channel(`game-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        safeRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        safeRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `session_id=eq.${sessionId}`,
        },
        safeRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_events',
          filter: `session_id=eq.${sessionId}`,
        },
        safeRefresh,
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [enabled, onChange, sessionId]);
}

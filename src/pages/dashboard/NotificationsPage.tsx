import { Box, CircularProgress } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { acceptRequest, declineRequest } from '../../lib/api/directoryApi';
import { supabase } from '../../lib/auth/supabaseClient';
import { toMessage } from '../../lib/utils/errors';
import { fetchNotificationRows } from './notificationsData';
import { type NotificationRow, NotificationsView } from './notificationsPageUi';

export const NotificationsPage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    if (!currentSession?.user?.id) {
      setLoading(false);
      return;
    }

    setSession(currentSession);
    setRows(await fetchNotificationRows(currentSession.user.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAsRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setMarkingRead(true);
    try {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id);
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, read_at: now } : row)),
      );
    } finally {
      setMarkingRead(false);
    }
  }, []);

  const dismissRow = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setDismissingId(id);
    try {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id);
      setRows((prev) => prev.filter((row) => row.id !== id));
    } finally {
      setDismissingId(null);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id) return;

    const now = new Date().toISOString();
    setMarkingRead(true);
    try {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('recipient_id', session.user.id)
        .is('read_at', null);
      setRows((prev) =>
        prev.map((row) => ({ ...row, read_at: row.read_at ?? now })),
      );
    } finally {
      setMarkingRead(false);
    }
  }, [session?.user?.id]);

  const handleConnectionDecision = useCallback(
    async (row: NotificationRow, decision: 'accept' | 'decline') => {
      if (!row.actor_id) return;

      setError(null);
      setActingRequestId(row.id);
      try {
        if (decision === 'accept') {
          await acceptRequest(supabase, row.actor_id);
        } else {
          await declineRequest(supabase, row.actor_id);
        }
        setRows((prev) => prev.filter((item) => item.id !== row.id));
      } catch (cause) {
        setError(toMessage(cause));
      } finally {
        setActingRequestId(null);
      }
    },
    [],
  );

  if (!session) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  return (
    <NotificationsView
      error={error}
      clearError={() => setError(null)}
      rows={rows}
      loading={loading}
      unreadCount={rows.filter((row) => !row.read_at).length}
      markingRead={markingRead}
      dismissingId={dismissingId}
      markAllAsRead={() => void markAllAsRead()}
      actingRequestId={actingRequestId}
      handleConnectionDecision={(row, decision) =>
        void handleConnectionDecision(row, decision)
      }
      markAsRead={(id) => void markAsRead(id)}
      dismissRow={(id) => void dismissRow(id)}
    />
  );
};

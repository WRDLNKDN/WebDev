import { Box, CircularProgress } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id);
      if (!error) {
        setRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, read_at: now } : row)),
        );
      }
    } catch (err) {
      setError(toMessage(err));
    }
  }, []);

  const dismissRow = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setDismissingId(id);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id);
      if (!error) {
        setRows((prev) => prev.filter((row) => row.id !== id));
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setDismissingId(null);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id) return;

    const now = new Date().toISOString();
    setMarkingRead(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('recipient_id', session.user.id)
        .is('read_at', null);
      if (!error) {
        setRows((prev) =>
          prev.map((row) => ({ ...row, read_at: row.read_at ?? now })),
        );
      }
    } finally {
      setMarkingRead(false);
    }
  }, [session?.user?.id]);

  const clearAll = useCallback(async () => {
    if (!session?.user?.id) return;
    if (rows.length === 0) return;

    // Lightweight confirmation
    if (
      !window.confirm(
        `Are you sure you want to remove all ${rows.length} notification${rows.length === 1 ? '' : 's'}? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', session.user.id);
      if (!error) {
        setRows([]);
      }
    } catch (err) {
      setError(toMessage(err));
    }
  }, [session?.user?.id, rows.length]);

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

  // Memoize unreadCount before return (must be before early return)
  const unreadCount = useMemo(
    () => rows.filter((row) => !row.read_at).length,
    [rows],
  );

  if (!session) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
        }}
      >
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
      unreadCount={unreadCount}
      markingRead={markingRead}
      dismissingId={dismissingId}
      markAllAsRead={() => void markAllAsRead()}
      actingRequestId={actingRequestId}
      handleConnectionDecision={(row, decision) =>
        void handleConnectionDecision(row, decision)
      }
      markAsRead={(id) => void markAsRead(id)}
      dismissRow={(id) => void dismissRow(id)}
      clearAll={() => void clearAll()}
    />
  );
};

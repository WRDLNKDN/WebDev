import { Box, Button, CircularProgress, Typography } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { acceptRequest, declineRequest } from '../../lib/api/directoryApi';
import { supabase } from '../../lib/auth/supabaseClient';
import { requestNotificationsUnreadRefresh } from '../../lib/notifications/notificationsUnreadSync';
import { markNotificationRowReadAt } from '../../lib/notifications/updateNotificationReadAt';
import { toMessage } from '../../lib/utils/errors';
import { fetchNotificationRows } from './notificationsData';
import { type NotificationRow, NotificationsView } from './notificationsPageUi';

export const NotificationsPage = () => {
  const [session, setSession] = useState<Session | null>(null);
  /** False until the first `getSession` completes (avoids infinite spinner when unauthenticated). */
  const [sessionResolved, setSessionResolved] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    if (!currentSession?.user?.id) {
      setSession(null);
      setRows([]);
      setLoading(false);
      setSessionResolved(true);
      return;
    }

    setSession(currentSession);
    setRows(await fetchNotificationRows(currentSession.user.id));
    setLoading(false);
    setSessionResolved(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const result = await markNotificationRowReadAt(id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, read_at: result.readAt } : row,
        ),
      );
      requestNotificationsUnreadRefresh();
    } catch (err) {
      setError(toMessage(err));
    }
  }, []);

  const dismissRow = useCallback(async (id: string) => {
    setDismissingId(id);
    try {
      const result = await markNotificationRowReadAt(id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
      requestNotificationsUnreadRefresh();
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
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('recipient_id', session.user.id)
        .is('read_at', null);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setRows((prev) =>
        prev.map((row) => ({ ...row, read_at: row.read_at ?? now })),
      );
      requestNotificationsUnreadRefresh();
    } finally {
      setMarkingRead(false);
    }
  }, [session?.user?.id]);

  const clearAll = useCallback(async () => {
    if (!session?.user?.id) return;
    if (rows.length === 0) return;

    const n = rows.length;
    if (
      !window.confirm(
        `Remove all ${n} notification${n === 1 ? '' : 's'}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setClearingAll(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', session.user.id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      setRows([]);
      requestNotificationsUnreadRefresh();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setClearingAll(false);
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
        requestNotificationsUnreadRefresh();
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

  if (!sessionResolved) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  if (!session?.user?.id) {
    return (
      <Box
        data-testid="notifications-auth-prompt"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          py: 8,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" component="h1">
          Notifications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sign in to see your notifications.
        </Typography>
        <Button
          component={RouterLink}
          to="/signin"
          variant="contained"
          sx={{ textTransform: 'none' }}
        >
          Sign in
        </Button>
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
    <Box data-testid="notifications-activity-page">
      <NotificationsView
        error={error}
        clearError={() => setError(null)}
        rows={rows}
        loading={loading}
        unreadCount={unreadCount}
        markingRead={markingRead}
        clearingAll={clearingAll}
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
    </Box>
  );
};

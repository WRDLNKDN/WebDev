import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { acceptRequest, declineRequest } from '../../lib/api/directoryApi';
import {
  getNotificationLink,
  type NotificationPayload,
} from '../../lib/notifications/notificationLinks';
import { toMessage } from '../../lib/utils/errors';
import { ProfileAvatar } from '../../components/avatar/ProfileAvatar';
import { supabase } from '../../lib/auth/supabaseClient';

const POST_PREVIEW_MAX_LENGTH = 180;

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  payload: NotificationPayload;
  created_at: string;
  read_at: string | null;
  actor_handle?: string | null;
  actor_display_name?: string | null;
  actor_avatar?: string | null;
  /** False when referenced content (post, event, room) no longer exists. */
  reference_exists?: boolean;
  /** True when this notification points to a still-pending connection request. */
  connection_request_pending?: boolean;
  /** For post-related notifications: snippet of post body (140–200 chars), or null if N/A. */
  post_snippet?: string | null;
  /** For post-related notifications: first image URL from post media, or null if N/A. */
  post_thumbnail?: string | null;
};

import { formatPostTime } from '../../lib/post/formatPostTime';

function getNotificationLabel(row: NotificationRow): string {
  const actor = row.actor_display_name || row.actor_handle || 'Someone';
  switch (row.type) {
    case 'reaction':
      return `${actor} reacted to your post`;
    case 'comment':
      return `${actor} commented on your post`;
    case 'mention':
      return `${actor} mentioned you`;
    case 'repost':
      return `${actor} shared your post`;
    case 'chat_message':
      return `${actor} sent you a message`;
    case 'connection_request':
      return `${actor} wants to connect`;
    case 'connection_request_accepted':
      return `${actor} accepted your connection request`;
    case 'connection_request_declined':
      return `${actor} declined your connection request`;
    case 'event_rsvp':
      return `${actor} RSVP'd to your event`;
    default:
      return `${actor} did something`;
  }
}

export const NotificationsPage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const sess = sessionData.session;
    if (!sess?.user?.id) {
      setLoading(false);
      return;
    }
    setSession(sess);

    const { data: listRaw, error } = await supabase
      .from('notifications')
      .select(
        `id, recipient_id, actor_id, type, reference_id, reference_type, payload, created_at, read_at`,
      )
      .eq('recipient_id', sess.user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      setLoading(false);
      return;
    }
    const list = (listRaw ?? []) as NotificationRow[];

    const actorIds = [
      ...new Set(
        list.map((r) => r.actor_id).filter((id): id is string => id != null),
      ),
    ];

    let actors: Record<
      string,
      {
        handle: string | null;
        display_name: string | null;
        avatar: string | null;
      }
    > = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar')
        .in('id', actorIds);
      if (profiles) {
        actors = Object.fromEntries(
          profiles.map((p) => [
            p.id,
            {
              handle: p.handle ?? null,
              display_name: p.display_name ?? null,
              avatar: p.avatar ?? null,
            },
          ]),
        );
      }
    }

    const feedRefs = [
      ...new Set(
        list
          .filter(
            (x) => x.reference_type === 'feed_item' && x.reference_id != null,
          )
          .map((x) => x.reference_id as string),
      ),
    ];
    const eventRefs = [
      ...new Set(
        list
          .filter(
            (x) =>
              (x.type === 'event_rsvp' || x.reference_type === 'event') &&
              x.reference_id != null,
          )
          .map((x) => x.reference_id as string),
      ),
    ];
    const roomIds = [
      ...new Set(
        list
          .filter(
            (x) =>
              x.type === 'chat_message' &&
              x.payload &&
              typeof (x.payload as { room_id?: string }).room_id === 'string',
          )
          .map((x) => (x.payload as { room_id: string }).room_id),
      ),
    ];
    const connectionRequestIds = [
      ...new Set(
        list
          .filter(
            (x) => x.type === 'connection_request' && x.reference_id != null,
          )
          .map((x) => x.reference_id as string),
      ),
    ];

    let feedExists: Set<string> = new Set();
    let eventExists: Set<string> = new Set();
    let roomExists: Set<string> = new Set();
    let pendingConnectionRequestIds: Set<string> = new Set();

    const feedSnippets: Record<string, string> = {};
    const feedThumbnails: Record<string, string> = {};
    if (feedRefs.length > 0) {
      const { data: feedRows } = await supabase
        .from('feed_items')
        .select('id, payload')
        .in('id', feedRefs);
      const feedList = feedRows ?? [];
      feedExists = new Set(feedList.map((x) => x.id));
      for (const row of feedList as {
        id: string;
        payload?: {
          body?: string;
          text?: string;
          images?: string[];
          snapshot?: { url?: string };
        };
      }[]) {
        const raw = row.payload?.body ?? row.payload?.text ?? '';
        const text = typeof raw === 'string' ? raw.trim() : '';
        if (text) {
          feedSnippets[row.id] =
            text.length <= POST_PREVIEW_MAX_LENGTH
              ? text
              : `${text.slice(0, POST_PREVIEW_MAX_LENGTH)}\u2026`;
        }
        const firstImage =
          Array.isArray(row.payload?.images) && row.payload.images.length > 0
            ? row.payload.images[0]
            : row.payload?.snapshot?.url;
        if (typeof firstImage === 'string' && firstImage.trim()) {
          feedThumbnails[row.id] = firstImage.trim();
        }
      }
    }
    if (eventRefs.length > 0) {
      const { data: evRows } = await supabase
        .from('events')
        .select('id')
        .in('id', eventRefs);
      eventExists = new Set((evRows ?? []).map((x: { id: string }) => x.id));
    }
    if (roomIds.length > 0) {
      const { data: roomRows } = await supabase
        .from('chat_rooms')
        .select('id')
        .in('id', roomIds);
      roomExists = new Set((roomRows ?? []).map((x) => x.id));
    }
    if (connectionRequestIds.length > 0) {
      const { data: requestRows } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('recipient_id', sess.user.id)
        .in('id', connectionRequestIds);
      pendingConnectionRequestIds = new Set(
        (requestRows ?? [])
          .filter((x) => x.status === 'pending')
          .map((x) => x.id),
      );
    }

    const refExists = (r: NotificationRow): boolean => {
      if (r.reference_type === 'feed_item' && r.reference_id)
        return feedExists.has(r.reference_id);
      if (
        (r.type === 'event_rsvp' || r.reference_type === 'event') &&
        r.reference_id
      )
        return eventExists.has(r.reference_id);
      if (
        r.type === 'chat_message' &&
        r.payload &&
        typeof (r.payload as { room_id?: string }).room_id === 'string'
      )
        return roomExists.has((r.payload as { room_id: string }).room_id);
      return true;
    };

    const postRelatedTypes = new Set([
      'comment',
      'reaction',
      'mention',
      'repost',
    ]);
    const enriched: NotificationRow[] = list.map((r) => {
      const a = r.actor_id ? actors[r.actor_id] : null;
      const refExistsVal = refExists(r);
      const isPostRelated =
        r.reference_type === 'feed_item' &&
        r.reference_id != null &&
        postRelatedTypes.has(r.type);
      const post_snippet =
        isPostRelated && refExistsVal && r.reference_id
          ? (feedSnippets[r.reference_id] ?? null)
          : undefined;
      const post_thumbnail =
        isPostRelated && r.reference_id
          ? (feedThumbnails[r.reference_id] ?? null)
          : undefined;
      return {
        ...r,
        payload: (r.payload ?? {}) as NotificationPayload,
        actor_handle: a?.handle ?? null,
        actor_display_name: a?.display_name ?? null,
        actor_avatar: a?.avatar ?? null,
        reference_exists: refExistsVal,
        connection_request_pending:
          r.type === 'connection_request' && r.reference_id != null
            ? pendingConnectionRequestIds.has(r.reference_id)
            : undefined,
        post_snippet: isPostRelated ? (post_snippet ?? null) : undefined,
        post_thumbnail: isPostRelated ? (post_thumbnail ?? null) : undefined,
      };
    });

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAsRead = useCallback(async (id: string) => {
    setMarkingRead(true);
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, read_at: new Date().toISOString() } : r,
        ),
      );
    } finally {
      setMarkingRead(false);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id) return;
    setMarkingRead(true);
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', session.user.id)
        .is('read_at', null);
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          read_at: r.read_at ?? new Date().toISOString(),
        })),
      );
    } finally {
      setMarkingRead(false);
    }
  }, [session?.user?.id]);

  const unreadCount = rows.filter((r) => !r.read_at).length;

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
        setRows((prev) => prev.filter((r) => r.id !== row.id));
      } catch (e) {
        setError(toMessage(e));
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
    <Box sx={{ py: 3 }}>
      <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', px: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography component="h1" variant="h5" fontWeight={600}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => void markAllAsRead()}
              disabled={markingRead}
              sx={{ textTransform: 'none' }}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress aria-label="Loading notifications" />
          </Box>
        ) : rows.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}
          >
            <NotificationsNoneIcon
              sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
            />
            <Typography variant="body1" color="text.secondary">
              No notifications yet.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              You&apos;ll see reactions, comments, and mentions here.
            </Typography>
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: 'hidden' }}
          >
            <List disablePadding>
              {rows
                .filter(
                  (row) =>
                    !(
                      row.type === 'connection_request' &&
                      row.connection_request_pending === false
                    ),
                )
                .map((row) => (
                  <ListItem key={row.id} disablePadding divider>
                    {row.type === 'connection_request' &&
                    row.connection_request_pending ? (
                      <Box
                        sx={{
                          width: '100%',
                          py: 1.5,
                          px: 2,
                          bgcolor: row.read_at ? undefined : 'action.hover',
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: 2,
                        }}
                      >
                        <ProfileAvatar
                          src={row.actor_avatar ?? undefined}
                          alt={
                            row.actor_display_name || row.actor_handle || '?'
                          }
                          size="small"
                        />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <ListItemText
                            primary={getNotificationLabel(row)}
                            secondary="Approve or decline this connection request"
                            primaryTypographyProps={{
                              fontWeight: row.read_at ? 400 : 600,
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                            }}
                            sx={{ m: 0 }}
                          />
                        </Box>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              void handleConnectionDecision(row, 'accept')
                            }
                            disabled={actingRequestId === row.id}
                            sx={{
                              width: { xs: '100%', sm: 'auto' },
                              bgcolor: 'success.main',
                              color: '#000',
                              '&:hover': {
                                bgcolor: 'success.dark',
                                color: '#000',
                              },
                              '&.Mui-disabled': {
                                bgcolor: 'action.disabledBackground',
                                color: 'action.disabled',
                              },
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              void handleConnectionDecision(row, 'decline')
                            }
                            disabled={actingRequestId === row.id}
                            sx={{
                              width: { xs: '100%', sm: 'auto' },
                              bgcolor: 'error.main',
                              color: '#000',
                              '&:hover': {
                                bgcolor: 'error.dark',
                                color: '#000',
                              },
                              '&.Mui-disabled': {
                                bgcolor: 'action.disabledBackground',
                                color: 'action.disabled',
                              },
                            }}
                          >
                            Decline
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <ListItemButton
                        component={RouterLink}
                        to={getNotificationLink(row)}
                        sx={{
                          py: 1.5,
                          bgcolor: row.read_at ? undefined : 'action.hover',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                        }}
                        onClick={() => {
                          if (!row.read_at) void markAsRead(row.id);
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            width: '100%',
                          }}
                        >
                          <ProfileAvatar
                            src={row.actor_avatar ?? undefined}
                            alt={
                              row.actor_display_name || row.actor_handle || '?'
                            }
                            size="small"
                            sx={{ mr: 2, flexShrink: 0 }}
                          />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <ListItemText
                              primary={getNotificationLabel(row)}
                              secondary={formatPostTime(row.created_at)}
                              primaryTypographyProps={{
                                fontWeight: row.read_at ? 400 : 600,
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                              }}
                              sx={{ m: 0 }}
                            />
                            {row.reference_type === 'feed_item' &&
                              (row.type === 'comment' ||
                                row.type === 'reaction' ||
                                row.type === 'mention' ||
                                row.type === 'repost') && (
                                <Box
                                  sx={{
                                    mt: 1,
                                    p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    gap: 1.5,
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  {row.post_thumbnail && (
                                    <Box
                                      component="img"
                                      src={row.post_thumbnail}
                                      alt=""
                                      sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 1,
                                        objectFit: 'cover',
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                  <Typography
                                    variant="caption"
                                    component="span"
                                    sx={{
                                      color: 'text.secondary',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'normal',
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                  >
                                    {row.reference_exists === false
                                      ? 'This post is no longer available or not available to you.'
                                      : (row.post_snippet ?? '\u2014')}
                                  </Typography>
                                </Box>
                              )}
                          </Box>
                          {!row.read_at && (
                            <NotificationsActiveIcon
                              sx={{
                                fontSize: 16,
                                color: 'primary.main',
                                ml: 1,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </Box>
                      </ListItemButton>
                    )}
                  </ListItem>
                ))}
            </List>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

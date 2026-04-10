import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DoNotDisturbAltIcon from '@mui/icons-material/DoNotDisturbAlt';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ProfileAvatar } from '../../components/avatar/ProfileAvatar';
import {
  getNotificationLink,
  type NotificationPayload,
} from '../../lib/notifications/notificationLinks';
import { formatPostTime } from '../../lib/post/formatPostTime';

export type NotificationRow = {
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
  reference_exists?: boolean;
  connection_request_pending?: boolean;
  post_snippet?: string | null;
  post_thumbnail?: string | null;
  game_name?: string | null;
  game_peer_summary?: string | null;
  game_actor_label?: string | null;
};

export const getNotificationLabel = (row: NotificationRow): string => {
  const actor = row.actor_display_name || row.actor_handle || 'Someone';
  switch (row.type) {
    case 'reaction':
      return `${actor} reacted to your post`;
    case 'comment':
      return `${actor} commented on your post`;
    case 'mention':
      // Check if it's a chat mention vs feed mention
      if (row.reference_type === 'chat_message') {
        return `${actor} mentioned you in a group chat`;
      }
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
    case 'game_invite':
      return `${actor} invited you to ${row.game_name ?? 'a game'}`;
    case 'game_invite_accepted':
      return `${actor} accepted your ${row.game_name ?? 'game'} invitation`;
    case 'game_invite_declined':
      return `${actor} declined your ${row.game_name ?? 'game'} invitation`;
    case 'game_invite_canceled':
      return `${actor} canceled the ${row.game_name ?? 'game'} invitation`;
    case 'game_your_turn':
      return `Your turn in ${row.game_name ?? 'a game'}`;
    case 'game_completed':
      return `${row.game_name ?? 'Game'} completed`;
    default:
      return `${actor} did something`;
  }
};

const getNotificationSecondary = (row: NotificationRow): string => {
  if (
    row.type === 'game_invite' ||
    row.type === 'game_invite_accepted' ||
    row.type === 'game_invite_declined' ||
    row.type === 'game_invite_canceled' ||
    row.type === 'game_your_turn' ||
    row.type === 'game_completed'
  ) {
    return row.game_peer_summary ?? formatPostTime(row.created_at);
  }
  return formatPostTime(row.created_at);
};

type RowProps = {
  row: NotificationRow;
  actingRequestId: string | null;
  handleConnectionDecision: (
    row: NotificationRow,
    decision: 'accept' | 'decline',
  ) => void;
  markAsRead: (id: string) => void;
  dismissRow: (id: string) => void;
  dismissingId: string | null;
};

const NotificationRowItem = ({
  row,
  actingRequestId,
  handleConnectionDecision,
  markAsRead,
  dismissRow,
  dismissingId,
}: RowProps) => (
  <ListItem key={row.id} disablePadding divider>
    {row.type === 'connection_request' && row.connection_request_pending ? (
      <Box
        sx={{
          width: '100%',
          py: 1.5,
          px: 2,
          bgcolor: row.read_at ? undefined : 'action.hover',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            minHeight: 24,
          }}
        >
          <IconButton
            size="small"
            aria-label="Dismiss notification"
            disabled={dismissingId === row.id}
            onClick={() => dismissRow(row.id)}
            sx={{
              color: 'text.secondary',
              p: 0.25,
              '&:hover': { color: 'error.main', bgcolor: 'transparent' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            width: '100%',
          }}
        >
          <ProfileAvatar
            src={row.actor_avatar ?? undefined}
            alt={row.actor_display_name || row.actor_handle || '?'}
            size="small"
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <ListItemText
              primary={getNotificationLabel(row)}
              secondary="Approve or decline this connection request"
              primaryTypographyProps={{ fontWeight: row.read_at ? 400 : 600 }}
              secondaryTypographyProps={{ variant: 'caption' }}
              sx={{ m: 0 }}
            />
          </Box>
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Button
            size="small"
            variant="contained"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={() => handleConnectionDecision(row, 'accept')}
            disabled={actingRequestId === row.id}
            aria-label="Approve connection request"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              bgcolor: 'success.main',
              color: '#000',
              '&:hover': { bgcolor: 'success.dark', color: '#000' },
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
            startIcon={<DoNotDisturbAltIcon />}
            onClick={() => handleConnectionDecision(row, 'decline')}
            disabled={actingRequestId === row.id}
            aria-label="Decline connection request"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              bgcolor: 'error.main',
              color: '#000',
              '&:hover': { bgcolor: 'error.dark', color: '#000' },
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
          if (!row.read_at) markAsRead(row.id);
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            width: '100%',
            minHeight: 24,
            mb: 0.25,
          }}
        >
          <IconButton
            size="small"
            aria-label="Dismiss notification"
            disabled={dismissingId === row.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismissRow(row.id);
            }}
            sx={{
              color: 'text.secondary',
              p: 0.25,
              '&:hover': { color: 'error.main', bgcolor: 'transparent' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
          <ProfileAvatar
            src={row.actor_avatar ?? undefined}
            alt={row.actor_display_name || row.actor_handle || '?'}
            size="small"
            sx={{ mr: 2, flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <ListItemText
              primary={getNotificationLabel(row)}
              secondary={getNotificationSecondary(row)}
              primaryTypographyProps={{ fontWeight: row.read_at ? 400 : 600 }}
              secondaryTypographyProps={{ variant: 'caption' }}
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
                    bgcolor: 'rgba(56,132,210,0.14)',
                    border: '1px solid rgba(156,187,217,0.18)',
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
        </Box>
      </ListItemButton>
    )}
  </ListItem>
);

type NotificationsViewProps = {
  error: string | null;
  clearError: () => void;
  rows: NotificationRow[];
  loading: boolean;
  unreadCount: number;
  markingRead: boolean;
  clearingAll: boolean;
  dismissingId: string | null;
  markAllAsRead: () => void;
  clearAll: () => void;
  actingRequestId: string | null;
  handleConnectionDecision: (
    row: NotificationRow,
    decision: 'accept' | 'decline',
  ) => void;
  markAsRead: (id: string) => void;
  dismissRow: (id: string) => void;
};

export const NotificationsView = ({
  error,
  clearError,
  rows,
  loading,
  unreadCount,
  markingRead,
  clearingAll,
  dismissingId,
  markAllAsRead,
  clearAll,
  actingRequestId,
  handleConnectionDecision,
  markAsRead,
  dismissRow,
}: NotificationsViewProps) => (
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
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <Button
              size="small"
              variant="outlined"
              onClick={markAllAsRead}
              disabled={markingRead}
              sx={{ textTransform: 'none' }}
            >
              Mark all as read
            </Button>
          )}
          {rows.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={clearAll}
              disabled={loading || markingRead || clearingAll}
              aria-busy={clearingAll}
              sx={{ textTransform: 'none' }}
            >
              {clearingAll ? 'Clearing…' : 'Clear All'}
            </Button>
          )}
        </Stack>
      </Box>
      {error && (
        <Alert severity="error" onClose={clearError}>
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
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
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
                <NotificationRowItem
                  key={row.id}
                  row={row}
                  actingRequestId={actingRequestId}
                  handleConnectionDecision={handleConnectionDecision}
                  markAsRead={markAsRead}
                  dismissRow={dismissRow}
                  dismissingId={dismissingId}
                />
              ))}
          </List>
        </Paper>
      )}
    </Stack>
  </Box>
);

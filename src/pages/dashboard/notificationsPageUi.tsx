import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
};

export const getNotificationLabel = (row: NotificationRow): string => {
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
  deleteRow: (id: string) => void;
  dismissingId: string | null;
  deletingId: string | null;
};

const NotificationRowItem = ({
  row,
  actingRequestId,
  handleConnectionDecision,
  markAsRead,
  dismissRow,
  deleteRow,
  dismissingId,
  deletingId,
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
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ justifyContent: 'flex-end' }}
          >
            <IconButton
              size="small"
              aria-label="Dismiss notification"
              disabled={dismissingId === row.id || deletingId === row.id}
              onClick={() => dismissRow(row.id)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Delete notification"
              disabled={dismissingId === row.id || deletingId === row.id}
              onClick={() => deleteRow(row.id)}
              sx={{ color: 'text.secondary' }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
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
              secondary={formatPostTime(row.created_at)}
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
          {!row.read_at && (
            <NotificationsActiveIcon
              sx={{ fontSize: 16, color: 'primary.main', ml: 1, flexShrink: 0 }}
            />
          )}
          <Stack
            direction="row"
            spacing={0.25}
            sx={{ ml: 0.5, flexShrink: 0 }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <IconButton
              size="small"
              aria-label="Dismiss notification"
              disabled={dismissingId === row.id || deletingId === row.id}
              onClick={() => dismissRow(row.id)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Delete notification"
              disabled={dismissingId === row.id || deletingId === row.id}
              onClick={() => deleteRow(row.id)}
              sx={{ color: 'text.secondary' }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
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
  dismissingId: string | null;
  deletingId: string | null;
  markAllAsRead: () => void;
  actingRequestId: string | null;
  handleConnectionDecision: (
    row: NotificationRow,
    decision: 'accept' | 'decline',
  ) => void;
  markAsRead: (id: string) => void;
  dismissRow: (id: string) => void;
  deleteRow: (id: string) => void;
};

export const NotificationsView = ({
  error,
  clearError,
  rows,
  loading,
  unreadCount,
  markingRead,
  dismissingId,
  deletingId,
  markAllAsRead,
  actingRequestId,
  handleConnectionDecision,
  markAsRead,
  dismissRow,
  deleteRow,
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
                  deleteRow={deleteRow}
                  dismissingId={dismissingId}
                  deletingId={deletingId}
                />
              ))}
          </List>
        </Paper>
      )}
    </Stack>
  </Box>
);

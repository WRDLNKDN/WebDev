import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  InputAdornment,
  List,
  ListItemButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import {
  deriveVisibleChatRooms,
  getChatRoomLabel,
} from '../../../lib/chat/roomListState';
import { RemoveChatConfirmDialog } from '../dialogs/RemoveChatConfirmDialog';
import { ChatRoomRow } from './ChatRoomRow';

type ChatRoomListProps = {
  rooms: ChatRoomWithMembers[];
  loading: boolean;
  currentUserId?: string;
  onCreateGroup?: () => void;
  onStartDm?: () => void;
  onRemoveChat?: (roomId: string) => void;
  onToggleFavorite?: (roomId: string, isFavorite: boolean) => void;
  /** Base path for room links (e.g. /chat-full so room clicks stay on full chat page). Default /chat. */
  chatPathPrefix?: string;
  /** When false, hide the top “Messages” heading (e.g. docked shell has its own title). */
  showMessagesHeading?: boolean;
};

const DEFAULT_CHAT_PREFIX = '/chat';
const VISUALLY_HIDDEN_SX = {
  position: 'absolute',
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

function getPrimaryActionButtonSx(theme: Theme, isLightChrome: boolean) {
  if (isLightChrome) {
    return {
      color: theme.palette.primary.contrastText,
      background: theme.palette.primary.main,
      boxShadow: 'none',
      '&:hover': {
        background: theme.palette.primary.dark,
      },
    };
  }

  return {
    color: 'white',
    background:
      'linear-gradient(180deg, rgba(39,63,122,0.96) 0%, rgba(19,31,62,0.98) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    '&:hover': {
      background:
        'linear-gradient(180deg, rgba(46,73,140,0.98) 0%, rgba(22,35,70,1) 100%)',
    },
  };
}

function getSecondaryActionButtonSx(theme: Theme, isLightChrome: boolean) {
  if (isLightChrome) {
    return {
      color: theme.palette.primary.main,
      borderColor: alpha(theme.palette.primary.main, 0.45),
      backgroundColor: alpha(theme.palette.primary.main, 0.06),
      '&:hover': {
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
      },
    };
  }

  return {
    color: 'white',
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(13, 18, 33, 0.82)',
    '&:hover': {
      borderColor: 'rgba(140,190,255,0.38)',
      backgroundColor: 'rgba(18, 25, 46, 0.92)',
    },
  };
}

function getEmptyRoomListMessage(args: {
  loading: boolean;
  rooms: ChatRoomWithMembers[];
  filteredRooms: ChatRoomWithMembers[];
  searchQuery: string;
}): string | null {
  const { loading, rooms, filteredRooms, searchQuery } = args;
  if (loading) return 'Loading…';
  if (rooms.length === 0) return 'No conversations yet';
  if (filteredRooms.length === 0) {
    return searchQuery.trim()
      ? 'No matches for your search'
      : 'No conversations match this view';
  }
  return null;
}

type ChatRoomListHeaderProps = {
  theme: Theme;
  isLightChrome: boolean;
  panelPrimaryText: string;
  panelSecondaryText: string;
  showMessagesHeading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCreateGroup?: () => void;
  onStartDm?: () => void;
};

const ChatRoomListHeader = ({
  theme,
  isLightChrome,
  panelPrimaryText,
  panelSecondaryText,
  showMessagesHeading,
  searchQuery,
  onSearchChange,
  onCreateGroup,
  onStartDm,
}: ChatRoomListHeaderProps) => {
  const hasQuickActions = Boolean(onStartDm || onCreateGroup);

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 1.1 },
        borderBottom: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.1 : 0.06)}`,
        background: isLightChrome
          ? alpha(theme.palette.background.paper, 0.92)
          : 'linear-gradient(180deg, rgba(10,16,34,0.88) 0%, rgba(10,16,34,0.62) 100%)',
        backdropFilter: isLightChrome ? 'none' : 'blur(14px)',
        color: panelPrimaryText,
      }}
    >
      <Typography
        id="chat-room-list-heading"
        variant={showMessagesHeading ? 'subtitle1' : 'subtitle2'}
        component="h2"
        fontWeight={showMessagesHeading ? 700 : undefined}
        sx={
          showMessagesHeading
            ? { color: panelPrimaryText, mb: 1 }
            : VISUALLY_HIDDEN_SX
        }
      >
        {showMessagesHeading ? 'Messages' : 'Conversations'}
      </Typography>
      <TextField
        size="small"
        fullWidth
        placeholder="Search messages"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        inputProps={{
          'aria-label': 'Search messages',
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                fontSize="small"
                sx={{ opacity: 0.7, color: panelSecondaryText }}
              />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 1.1,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: isLightChrome
              ? alpha(theme.palette.common.black, 0.025)
              : 'rgba(255,255,255,0.035)',
            border: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.65 : 0.18)}`,
            boxShadow: 'none',
          },
          '& .MuiInputBase-root': {
            color: panelPrimaryText,
          },
          '& .MuiInputBase-input::placeholder': {
            color: panelSecondaryText,
            opacity: 1,
          },
        }}
      />
      {hasQuickActions ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            pt: 0.1,
          }}
        >
          {onStartDm ? (
            <Button
              fullWidth
              variant="contained"
              onClick={onStartDm}
              startIcon={<AddCommentOutlinedIcon />}
              sx={{
                justifyContent: 'center',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 1.5,
                px: 1.1,
                py: 0.8,
                ...getPrimaryActionButtonSx(theme, isLightChrome),
              }}
            >
              New chat
            </Button>
          ) : null}
          {onCreateGroup ? (
            <Button
              fullWidth
              variant="outlined"
              onClick={onCreateGroup}
              startIcon={<GroupOutlinedIcon />}
              sx={{
                justifyContent: 'center',
                textTransform: 'none',
                borderRadius: 1.5,
                px: 1.1,
                py: 0.8,
                ...getSecondaryActionButtonSx(theme, isLightChrome),
              }}
            >
              New group
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
};

type ChatRoomListBodyProps = {
  loading: boolean;
  rooms: ChatRoomWithMembers[];
  filteredRooms: ChatRoomWithMembers[];
  searchQuery: string;
  currentUserId?: string;
  roomId?: string;
  base: string;
  isLightChrome: boolean;
  theme: Theme;
  panelPrimaryText: string;
  panelSecondaryText: string;
  onToggleFavorite?: (roomId: string, isFavorite: boolean) => void;
  onRemoveChat?: (roomId: string) => void;
  onRequestRemove: (id: string, label: string) => void;
};

const ChatRoomListBody = ({
  loading,
  rooms,
  filteredRooms,
  searchQuery,
  currentUserId,
  roomId,
  base,
  isLightChrome,
  theme,
  panelPrimaryText,
  panelSecondaryText,
  onToggleFavorite,
  onRemoveChat,
  onRequestRemove,
}: ChatRoomListBodyProps) => {
  const emptyMessage = getEmptyRoomListMessage({
    loading,
    rooms,
    filteredRooms,
    searchQuery,
  });

  return (
    <List
      aria-labelledby="chat-room-list-heading"
      sx={{
        flex: 1,
        overflow: 'auto',
        py: 0,
        px: 0,
        color: panelPrimaryText,
      }}
    >
      {emptyMessage ? (
        <ListItemButton disabled>
          <Typography variant="body2" color={panelSecondaryText}>
            {emptyMessage}
          </Typography>
        </ListItemButton>
      ) : (
        filteredRooms.map((room) => (
          <ChatRoomRow
            key={room.id}
            room={room}
            currentUserId={currentUserId}
            activeRoomId={roomId}
            base={base}
            isLightChrome={isLightChrome}
            theme={theme}
            panelPrimaryText={panelPrimaryText}
            panelSecondaryText={panelSecondaryText}
            onToggleFavorite={onToggleFavorite}
            onRemoveChat={onRemoveChat}
            onRequestRemove={onRequestRemove}
          />
        ))
      )}
    </List>
  );
};

export const ChatRoomList = ({
  rooms,
  loading,
  currentUserId,
  onCreateGroup,
  onStartDm,
  onRemoveChat,
  onToggleFavorite,
  chatPathPrefix = DEFAULT_CHAT_PREFIX,
  showMessagesHeading = true,
}: ChatRoomListProps) => {
  const theme = useTheme();
  const isLightChrome = theme.palette.mode === 'light';
  const { roomId } = useParams<{ roomId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const base = chatPathPrefix.replace(/\/$/, '');
  const panelPrimaryText = isLightChrome
    ? theme.palette.text.primary
    : 'rgba(252,250,255,0.96)';
  const panelSecondaryText = isLightChrome
    ? theme.palette.text.secondary
    : 'rgba(220,207,248,0.9)';

  const visibleRooms = useMemo(
    () =>
      deriveVisibleChatRooms(rooms, {
        currentUserId,
        filter: 'all',
        sort: 'favorites',
      }),
    [currentUserId, rooms],
  );

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleRooms;
    return visibleRooms.filter((room) => {
      const label = getChatRoomLabel(room, currentUserId).toLowerCase();
      const preview = (room.last_message_preview ?? '').toLowerCase();
      return label.includes(q) || preview.includes(q);
    });
  }, [visibleRooms, searchQuery, currentUserId]);

  const inboxMetaLabel =
    rooms.length === 0
      ? 'Ready for your first conversation'
      : `${rooms.length} conversation${rooms.length === 1 ? '' : 's'}`;

  const renderStatePanel = ({
    body,
    dataTestId,
    icon,
    title,
  }: {
    body: string;
    dataTestId: string;
    icon: ReactNode;
    title: string;
  }) => (
    <Box data-testid={dataTestId} sx={{ mt: 1, px: 0.25 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.4,
          px: 1.5,
          py: 1.6,
          borderRadius: 2.75,
          border: `1px solid ${alpha(theme.palette.divider, isLightChrome ? 0.18 : 0.14)}`,
          bgcolor: isLightChrome
            ? alpha(theme.palette.background.paper, 0.9)
            : 'linear-gradient(180deg, rgba(15,24,43,0.92) 0%, rgba(11,17,31,0.9) 100%)',
          boxShadow: isLightChrome
            ? '0 10px 28px rgba(15,23,42,0.08)'
            : '0 16px 34px rgba(0,0,0,0.18)',
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2.2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: isLightChrome
              ? theme.palette.primary.main
              : 'rgba(141,188,229,0.92)',
            bgcolor: isLightChrome
              ? alpha(theme.palette.primary.main, 0.12)
              : 'rgba(56,132,210,0.16)',
            border: `1px solid ${alpha(theme.palette.primary.main, isLightChrome ? 0.16 : 0.24)}`,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ color: panelPrimaryText, mb: 0.4, letterSpacing: '-0.01em' }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: panelSecondaryText,
              lineHeight: 1.58,
              maxWidth: 320,
            }}
          >
            {body}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ChatRoomListHeader
        theme={theme}
        isLightChrome={isLightChrome}
        panelPrimaryText={panelPrimaryText}
        panelSecondaryText={panelSecondaryText}
        showMessagesHeading={showMessagesHeading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateGroup={onCreateGroup}
        onStartDm={onStartDm}
      />
      <ChatRoomListBody
        loading={loading}
        rooms={rooms}
        filteredRooms={filteredRooms}
        searchQuery={searchQuery}
        currentUserId={currentUserId}
        roomId={roomId}
        base={base}
        isLightChrome={isLightChrome}
        theme={theme}
        panelPrimaryText={panelPrimaryText}
        panelSecondaryText={panelSecondaryText}
        onToggleFavorite={onToggleFavorite}
        onRemoveChat={onRemoveChat}
        onRequestRemove={(id, label) => setRemoveTarget({ id, label })}
      />
      {onRemoveChat && (
        <RemoveChatConfirmDialog
          open={Boolean(removeTarget)}
          roomLabel={removeTarget?.label ?? ''}
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => {
            const id = removeTarget?.id;
            if (!id) return undefined;
            return Promise.resolve(onRemoveChat(id));
          }}
        />
      )}
    </Box>
  );
};

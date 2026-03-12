import DeleteIcon from '@mui/icons-material/Delete';
import AddCommentIcon from '@mui/icons-material/AddComment';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import { GLASS_CARD } from '../../theme/candyStyles';
import { compactGlassDangerIconButtonSx } from '../../theme/iconActionStyles';

type Props = {
  mobile: boolean;
  drawerTopDesktop: number;
  drawerTopMobile: number;
  drawerWidth: number;
  avatarUrl: string | null;
  session: Session;
  menuButtonClick: (anchor: HTMLElement) => void;
  onStartDm: () => void;
  onCreateGroup: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  messageTab: 'focused' | 'other';
  setMessageTab: (value: 'focused' | 'other') => void;
  roomsLoading: boolean;
  rooms: ChatRoomWithMembers[];
  getRoomLabel: (room: ChatRoomWithMembers) => string;
  onOpenRoom: (roomId: string) => void;
  onRemoveChat: (e: React.MouseEvent, roomId: string) => void;
  onBackdropClick: () => void;
};

export const MessengerOverlayPanel = ({
  mobile,
  drawerTopDesktop,
  drawerTopMobile,
  drawerWidth,
  avatarUrl,
  session,
  menuButtonClick,
  onStartDm,
  onCreateGroup,
  searchQuery,
  setSearchQuery,
  messageTab,
  setMessageTab,
  roomsLoading,
  rooms,
  getRoomLabel,
  onOpenRoom,
  onRemoveChat,
  onBackdropClick,
}: Props) => (
  <>
    <Box
      aria-hidden
      onClick={onBackdropClick}
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0,0,0,0.35)',
        zIndex: 1299,
        animation: 'fadeIn 0.25s ease-out',
        '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    />

    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{
        ...GLASS_CARD,
        position: 'fixed',
        right: 0,
        top: mobile ? drawerTopMobile : drawerTopDesktop,
        width: mobile ? '100%' : drawerWidth,
        height: mobile
          ? `calc(100vh - ${drawerTopMobile}px)`
          : `calc(100vh - ${drawerTopDesktop}px)`,
        zIndex: 1300,
        borderLeft: '1px solid rgba(156,187,217,0.26)',
        borderRadius: '8px 0 0 8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'messengerSlideIn 0.35s cubic-bezier(0.32, 0, 0.37, 1)',
        '@keyframes messengerSlideIn': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderBottom: '1px solid rgba(156,187,217,0.26)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Avatar src={avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>
            {session?.user?.user_metadata?.name?.[0] ?? '?'}
          </Avatar>
          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
            Messaging
          </Typography>
          <IconButton
            aria-label="Messaging options"
            onClick={(e) => menuButtonClick(e.currentTarget)}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="New message"
            onClick={onStartDm}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <AddCommentIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="Create group"
            onClick={onCreateGroup}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <GroupAddIcon fontSize="small" />
          </IconButton>
        </Box>

        <TextField
          size="small"
          placeholder="Search messages"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 0 }}>
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              py: 0.5,
              pl: 1,
              pr: 1,
              fontSize: '0.875rem',
              '& input': { py: 0.5 },
            },
          }}
          sx={{
            m: 1,
            mt: 0.5,
            '& .MuiOutlinedInput-root': {
              minHeight: 36,
              bgcolor: 'action.hover',
              borderRadius: 1,
              '& fieldset': { borderColor: 'transparent' },
            },
          }}
        />

        <Stack direction="row" sx={{ px: 1, pb: 0 }}>
          {(
            [
              { id: 'focused' as const, label: 'Focused' },
              { id: 'other' as const, label: 'Other' },
            ] as const
          ).map(({ id, label }) => {
            const active = messageTab === id;
            return (
              <Typography
                key={id}
                component="button"
                type="button"
                aria-pressed={active}
                onClick={() => setMessageTab(id)}
                sx={{
                  border: 0,
                  background: 'none',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: active ? '#00a660' : 'text.secondary',
                  pb: 0.75,
                  pr: 2,
                  mr: 1,
                  borderBottom: '2px solid',
                  borderBottomColor: active ? '#00a660' : 'transparent',
                  textDecoration: active ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  borderRadius: 0,
                  '&:hover': {
                    color: active ? '#00a660' : 'text.primary',
                    textDecoration: 'underline',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {label}
              </Typography>
            );
          })}
        </Stack>

        <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
          {roomsLoading ? (
            <ListItemButton disabled>
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            </ListItemButton>
          ) : rooms.length === 0 ? (
            <ListItemButton disabled>
              <ListItemText
                primary="No conversations yet"
                secondary="Start a new chat or create a group"
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>
          ) : (
            (() => {
              const bySearch = rooms.filter(
                (r) =>
                  !searchQuery.trim() ||
                  getRoomLabel(r)
                    .toLowerCase()
                    .includes(searchQuery.trim().toLowerCase()),
              );
              const filtered =
                messageTab === 'focused'
                  ? bySearch.filter((r) => (r.unread_count ?? 0) > 0)
                  : bySearch;

              if (
                messageTab === 'focused' &&
                filtered.length === 0 &&
                bySearch.length > 0
              ) {
                return (
                  <ListItemButton disabled>
                    <ListItemText
                      primary="No focused conversations"
                      secondary="Conversations with new messages appear here"
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                );
              }

              if (filtered.length === 0) {
                return (
                  <ListItemButton disabled>
                    <ListItemText
                      primary="No matches"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItemButton>
                );
              }

              return filtered.map((r) => (
                <ListItemButton
                  key={r.id}
                  onClick={() => onOpenRoom(r.id)}
                  sx={{
                    borderBottom: '1px solid rgba(56,132,210,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {getRoomLabel(r)}
                      </Typography>
                      {(r.unread_count ?? 0) > 0 && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            px: 0.75,
                            py: 0.125,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                          }}
                        >
                          {r.unread_count! > 99 ? '99+' : r.unread_count}
                        </Typography>
                      )}
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.last_message_preview ??
                        (r.room_type === 'group'
                          ? `${r.members?.length ?? 0} members`
                          : '1:1')}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label="Remove chat"
                    size="small"
                    onClick={(e) => onRemoveChat(e, r.id)}
                    sx={{
                      ...compactGlassDangerIconButtonSx,
                      ml: 'auto',
                      flexShrink: 0,
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemButton>
              ));
            })()
          )}
        </List>
      </Box>
    </Box>
  </>
);

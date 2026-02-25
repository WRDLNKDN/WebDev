import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useChatRooms } from '../../hooks/useChat';

/**
 * Groups page (route: /groups) – open your active group chats.
 */
export const GroupsPage = () => {
  const { rooms, loading } = useChatRooms();
  const actionButtonSx = {
    color: 'text.primary',
    borderColor: 'rgba(255,255,255,0.42)',
    '&:hover': {
      borderColor: 'rgba(255,255,255,0.62)',
      bgcolor: 'rgba(255,255,255,0.05)',
    },
  } as const;
  const groupRooms = useMemo(
    () =>
      rooms
        .filter((room) => room.room_type === 'group')
        .sort((a, b) => {
          const aTime = a.last_message_at ? Date.parse(a.last_message_at) : 0;
          const bTime = b.last_message_at ? Date.parse(b.last_message_at) : 0;
          return bTime - aTime;
        }),
    [rooms],
  );

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <ForumIcon color="primary" />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Groups
              </Typography>
            </Stack>
            <Button
              component={RouterLink}
              to="/chat-full"
              variant="outlined"
              size="small"
              sx={actionButtonSx}
            >
              Open Chat Hub
            </Button>
          </Stack>

          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading your groups...
            </Typography>
          ) : groupRooms.length === 0 ? (
            <Stack spacing={1.5}>
              <Typography variant="body1" color="text.secondary">
                You are not in any groups yet.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Open Chat Hub to create a new group or accept an invite.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              {groupRooms.map((room) => (
                <Paper
                  key={room.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2 }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {room.name || 'Untitled group'}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: { xs: '100%', sm: 420 },
                        }}
                      >
                        {room.last_message_preview || 'No messages yet'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {(room.unread_count ?? 0) > 0 && (
                        <Chip
                          size="small"
                          color="primary"
                          label={`${room.unread_count} unread`}
                        />
                      )}
                      <Button
                        component={RouterLink}
                        to={`/chat-full/${room.id}`}
                        variant="outlined"
                        size="small"
                        endIcon={<OpenInNewIcon fontSize="small" />}
                        sx={actionButtonSx}
                      >
                        Open Group
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

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
import type { Session } from '@supabase/supabase-js';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { AssetAvatar } from '../../components/media/AssetThumbnail';
import { useChatRooms } from '../../hooks/useChat';
import { supabase } from '../../lib/auth/supabaseClient';
import { createNormalizedGroupImageAsset } from '../../lib/media/assets';

/**
 * Groups page (route: /groups) – open your active group chats.
 */
export const GroupsPage = () => {
  const { rooms, loading } = useChatRooms();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!cancelled) setSession(s ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
  const actionButtonSx = {
    color: 'text.primary',
    borderColor: 'rgba(255,255,255,0.42)',
    '&:hover': {
      borderColor: 'rgba(255,255,255,0.62)',
      bgcolor: 'rgba(56,132,210,0.12)',
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
            {session?.user?.id ? (
              <Button
                component={RouterLink}
                to="/chat-full"
                variant="outlined"
                size="small"
                sx={actionButtonSx}
              >
                Open Chat Hub
              </Button>
            ) : null}
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
                {session?.user?.id
                  ? 'Open Chat Hub to create a new group or accept an invite.'
                  : 'Sign in to use Chat and manage groups.'}
              </Typography>
            </Stack>
          ) : session?.user?.id ? (
            <Stack spacing={1.25}>
              {groupRooms.map((room) => (
                <Paper
                  key={room.id}
                  variant="outlined"
                  component={RouterLink}
                  to={`/chat-full/${room.id}`}
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 2,
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition:
                      'border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease, transform 140ms ease',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.42),
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)} inset`,
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${alpha(theme.palette.primary.main, 0.48)}`,
                      outlineOffset: 2,
                      borderColor: alpha(theme.palette.primary.main, 0.42),
                    },
                  })}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
                      <AssetAvatar
                        asset={createNormalizedGroupImageAsset(room)}
                        alt={room.name || 'Untitled group'}
                        size="small"
                        sx={{ width: 48, height: 48, flexShrink: 0 }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            textDecoration: 'underline',
                            textUnderlineOffset: '0.12em',
                            textDecorationColor: 'transparent',
                            transition: 'text-decoration-color 140ms ease',
                            '.MuiPaper-root:hover &': {
                              textDecorationColor: 'currentColor',
                            },
                          }}
                        >
                          {room.name || 'Untitled group'}
                        </Typography>
                        {room.description ? (
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
                            {room.description}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {(room.unread_count ?? 0) > 0 && (
                        <Chip
                          size="small"
                          color="primary"
                          label={`${room.unread_count} unread`}
                        />
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sign in to open your group chats.
            </Typography>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

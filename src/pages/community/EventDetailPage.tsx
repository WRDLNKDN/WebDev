import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { supabase } from '../../lib/auth/supabaseClient';

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  location_type: string | null;
  link_url: string | null;
  host_handle?: string | null;
  host_display_name?: string | null;
  host_avatar?: string | null;
};

type RsvpCounts = { yes: number; no: number; maybe: number };
type ViewerRsvp = string | null;

export const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpCounts, setRsvpCounts] = useState<RsvpCounts>({
    yes: 0,
    no: 0,
    maybe: 0,
  });
  const [viewerRsvp, setViewerRsvp] = useState<ViewerRsvp>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    setSession(sessionData.session ?? null);

    const { data: ev, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !ev) {
      setLoading(false);
      return;
    }

    if (sessionData.session?.user?.id) {
      const viewerId = sessionData.session.user.id;
      const { data: asBlocker } = await supabase
        .from('chat_blocks')
        .select('blocker_id')
        .eq('blocker_id', viewerId)
        .eq('blocked_user_id', ev.host_id)
        .maybeSingle();
      const { data: asBlocked } = await supabase
        .from('chat_blocks')
        .select('blocker_id')
        .eq('blocker_id', ev.host_id)
        .eq('blocked_user_id', viewerId)
        .maybeSingle();
      if (asBlocker || asBlocked) {
        setEvent(null);
        setLoading(false);
        return;
      }
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar')
      .eq('id', ev.host_id)
      .maybeSingle();

    setEvent({
      ...ev,
      host_handle: profiles?.handle ?? null,
      host_display_name: profiles?.display_name ?? null,
      host_avatar: profiles?.avatar ?? null,
    });

    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('status')
      .eq('event_id', id);

    const yes =
      rsvps?.filter((r: { status: string }) => r.status === 'yes').length ?? 0;
    const no =
      rsvps?.filter((r: { status: string }) => r.status === 'no').length ?? 0;
    const maybe =
      rsvps?.filter((r: { status: string }) => r.status === 'maybe').length ??
      0;
    setRsvpCounts({ yes, no, maybe });

    if (sessionData.session?.user?.id) {
      const { data: mine } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('event_id', id)
        .eq('user_id', sessionData.session.user.id)
        .maybeSingle();
      setViewerRsvp(mine?.status ?? null);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setRsvp = useCallback(
    async (status: 'yes' | 'no' | 'maybe') => {
      if (!id || !session?.user?.id || saving) return;
      setSaving(true);
      try {
        await supabase.from('event_rsvps').upsert(
          {
            event_id: id,
            user_id: session.user.id,
            status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'event_id,user_id' },
        );
        setViewerRsvp(status);
        await load();
      } finally {
        setSaving(false);
      }
    },
    [id, session?.user?.id, saving, load],
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress aria-label="Loading event" />
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Event not found
        </Typography>
        <Button
          component={RouterLink}
          to="/events"
          variant="outlined"
          sx={{ textTransform: 'none' }}
        >
          Back to Events
        </Button>
      </Box>
    );
  }

  const hostLabel = event.host_display_name || event.host_handle || 'Host';
  const isPast = new Date(event.start_at) < new Date();

  return (
    <Box sx={{ py: 3, px: 2, maxWidth: 640, mx: 'auto' }}>
      <Button
        component={RouterLink}
        to="/events"
        sx={{ mb: 2, textTransform: 'none' }}
      >
        ← Back to Events
      </Button>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          {isPast && (
            <Chip
              label="Past event"
              size="small"
              sx={{ mb: 2 }}
              color="default"
            />
          )}
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {event.title}
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <PersonIcon fontSize="small" color="action" />
              <Typography
                component={RouterLink}
                to={event.host_handle ? `/profile/${event.host_handle}` : '#'}
                variant="body1"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {hostLabel}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EventIcon fontSize="small" color="action" />
              <Typography variant="body1">
                {formatDate(event.start_at)}
                {event.end_at &&
                  ` – ${new Date(event.end_at).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`}
              </Typography>
            </Stack>
            {event.location && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <LocationOnIcon fontSize="small" color="action" />
                <Typography variant="body1">{event.location}</Typography>
                {event.location_type && (
                  <Chip
                    label={event.location_type}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            )}
          </Stack>

          {event.description && (
            <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
              {event.description}
            </Typography>
          )}

          {event.link_url && (
            <Button
              href={event.link_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              sx={{ mt: 2, textTransform: 'none' }}
            >
              View link
            </Button>
          )}

          {session && !isPast && (
            <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Will you attend?
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{
                  '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
                }}
              >
                <Button
                  size="small"
                  variant={viewerRsvp === 'yes' ? 'contained' : 'outlined'}
                  onClick={() => void setRsvp('yes')}
                  disabled={saving}
                  sx={{ textTransform: 'none' }}
                >
                  Yes {rsvpCounts.yes > 0 && `(${rsvpCounts.yes})`}
                </Button>
                <Button
                  size="small"
                  variant={viewerRsvp === 'maybe' ? 'contained' : 'outlined'}
                  onClick={() => void setRsvp('maybe')}
                  disabled={saving}
                  sx={{ textTransform: 'none' }}
                >
                  Maybe {rsvpCounts.maybe > 0 && `(${rsvpCounts.maybe})`}
                </Button>
                <Button
                  size="small"
                  variant={viewerRsvp === 'no' ? 'contained' : 'outlined'}
                  onClick={() => void setRsvp('no')}
                  disabled={saving}
                  sx={{ textTransform: 'none' }}
                >
                  No {rsvpCounts.no > 0 && `(${rsvpCounts.no})`}
                </Button>
              </Stack>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { filterEventsByBlockedHosts } from '../../lib/events/blockedFilter';
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
  host_handle?: string | null;
  host_display_name?: string | null;
  host_avatar?: string | null;
  yes_count?: number;
};

export const EventsPage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [past, setPast] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createStartAt, setCreateStartAt] = useState('');
  const [createEndAt, setCreateEndAt] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createLocationType, setCreateLocationType] = useState<
    'virtual' | 'physical' | ''
  >('');
  const [createLinkUrl, setCreateLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    setSession(sessionData.session ?? null);

    const { data: rows, error: err } = await supabase
      .from('events')
      .select('*')
      .order('start_at', { ascending: true });

    if (err) {
      setLoading(false);
      return;
    }

    let blockedHostIds = new Set<string>();
    if (sessionData.session?.user?.id) {
      const { data: asBlocker } = await supabase
        .from('chat_blocks')
        .select('blocked_user_id')
        .eq('blocker_id', sessionData.session.user.id);
      const { data: asBlocked } = await supabase
        .from('chat_blocks')
        .select('blocker_id')
        .eq('blocked_user_id', sessionData.session.user.id);
      blockedHostIds = new Set([
        ...(asBlocker ?? []).map((x) => x.blocked_user_id),
        ...(asBlocked ?? []).map((x) => x.blocker_id),
      ]);
    }

    const filteredRows = filterEventsByBlockedHosts(
      (rows ?? []) as EventRow[],
      blockedHostIds,
    );
    const now = new Date();
    const upcomingList: EventRow[] = [];
    const pastList: EventRow[] = [];

    for (const r of filteredRows) {
      const ev = r as EventRow;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar')
        .eq('id', ev.host_id)
        .maybeSingle();

      const { count } = await supabase
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', ev.id)
        .eq('status', 'yes');

      const enriched: EventRow = {
        ...ev,
        host_handle: profiles?.handle ?? null,
        host_display_name: profiles?.display_name ?? null,
        host_avatar: profiles?.avatar ?? null,
        yes_count: count ?? 0,
      };

      if (new Date(ev.start_at) >= now) {
        upcomingList.push(enriched);
      } else {
        pastList.push(enriched);
      }
    }

    upcomingList.sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
    pastList.sort(
      (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
    );

    setUpcoming(upcomingList);
    setPast(pastList);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!session?.user?.id || !createTitle.trim() || !createStartAt) {
      setError('Title and start date are required.');
      return;
    }
    const { data: suspension } = await supabase
      .from('chat_suspensions')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (suspension) {
      setError('Account suspended. You cannot create events.');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', session.user.id)
      .maybeSingle();
    if (profile && (profile as { status: string }).status === 'disabled') {
      setError('Account disabled.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase.from('events').insert({
        host_id: session.user.id,
        title: createTitle.trim(),
        description: createDescription.trim() || null,
        start_at: createStartAt,
        end_at: createEndAt || null,
        location: createLocation.trim() || null,
        location_type: createLocationType || null,
        link_url: createLinkUrl.trim() || null,
      });
      if (insertErr) throw insertErr;
      setCreateOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreateStartAt('');
      setCreateEndAt('');
      setCreateLocation('');
      setCreateLocationType('');
      setCreateLinkUrl('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <Box sx={{ py: 3, px: 2, maxWidth: 720, mx: 'auto' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" fontWeight={700}>
          Events
        </Typography>
        {session && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            Create Event
          </Button>
        )}
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label="Loading events" />
        </Box>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  mb: 2,
                  color: 'text.secondary',
                  fontWeight: 600,
                }}
              >
                Upcoming
              </Typography>
              <Stack spacing={2}>
                {upcoming.map((ev) => (
                  <Card
                    key={ev.id}
                    variant="outlined"
                    component={RouterLink}
                    to={`/events/${ev.id}`}
                    sx={{
                      textDecoration: 'none',
                      color: 'inherit',
                      borderRadius: 2,
                      transition: 'border-color 0.2s, background-color 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {ev.title}
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mt: 1 }}
                        flexWrap="wrap"
                      >
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {ev.host_display_name || ev.host_handle || 'Host'}
                        </Typography>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          •
                        </Typography>
                        <EventIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(ev.start_at)}
                        </Typography>
                        {ev.location && (
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              •
                            </Typography>
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {ev.location}
                            </Typography>
                          </>
                        )}
                      </Stack>
                      {ev.yes_count !== undefined && ev.yes_count > 0 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 1 }}
                        >
                          {ev.yes_count} attending
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {past.length > 0 && (
            <Box>
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  mb: 2,
                  color: 'text.secondary',
                  fontWeight: 600,
                }}
              >
                Past Events
              </Typography>
              <Stack spacing={2}>
                {past.map((ev) => (
                  <Card
                    key={ev.id}
                    variant="outlined"
                    component={RouterLink}
                    to={`/events/${ev.id}`}
                    sx={{
                      textDecoration: 'none',
                      color: 'inherit',
                      opacity: 0.85,
                      borderRadius: 2,
                      '&:hover': {
                        opacity: 1,
                        borderColor: 'divider',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {ev.title}
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mt: 1 }}
                        flexWrap="wrap"
                      >
                        <Typography variant="body2" color="text.secondary">
                          {ev.host_display_name || ev.host_handle || 'Host'}
                        </Typography>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          •
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(ev.start_at)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {upcoming.length === 0 && past.length === 0 && (
            <Paper
              variant="outlined"
              sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}
            >
              <EventIcon
                sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
              />
              <Typography variant="body1" color="text.secondary">
                No events yet.
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Create an event to bring the community together.
              </Typography>
              {session && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateOpen(true)}
                  sx={{ mt: 2, textTransform: 'none' }}
                >
                  Create Event
                </Button>
              )}
            </Paper>
          )}
        </>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Create Event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Title"
              required
              fullWidth
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="e.g. AMA with the team"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
            />
            <TextField
              label="Start"
              type="datetime-local"
              required
              fullWidth
              value={createStartAt}
              onChange={(e) => setCreateStartAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End"
              type="datetime-local"
              fullWidth
              value={createEndAt}
              onChange={(e) => setCreateEndAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Location"
              fullWidth
              value={createLocation}
              onChange={(e) => setCreateLocation(e.target.value)}
              placeholder="Virtual or physical address"
            />
            <TextField
              label="Location type"
              select
              fullWidth
              value={createLocationType}
              onChange={(e) =>
                setCreateLocationType(
                  e.target.value as 'virtual' | 'physical' | '',
                )
              }
              SelectProps={{ native: true }}
            >
              <option value="">—</option>
              <option value="virtual">Virtual</option>
              <option value="physical">Physical</option>
            </TextField>
            <TextField
              label="Link URL"
              fullWidth
              value={createLinkUrl}
              onChange={(e) => setCreateLinkUrl(e.target.value)}
              placeholder="https://..."
            />
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCreateOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreate()}
            disabled={submitting || !createTitle.trim() || !createStartAt}
            sx={{ textTransform: 'none' }}
          >
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

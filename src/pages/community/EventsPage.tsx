import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { filterEventsByBlockedHosts } from '../../lib/events/blockedFilter';
import { supabase } from '../../lib/auth/supabaseClient';
import { toMessage } from '../../lib/utils/errors';
import {
  CreateEventDialog,
  EventsContent,
  type CreateEventState,
} from './eventsPageUi';

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

const initialCreateState: CreateEventState = {
  createTitle: '',
  createDescription: '',
  createStartAt: '',
  createEndAt: '',
  createLocation: '',
  createLocationType: '',
  createLinkUrl: '',
};

export const EventsPage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [past, setPast] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createState, setCreateState] =
    useState<CreateEventState>(initialCreateState);
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
      if (new Date(ev.start_at) >= now) upcomingList.push(enriched);
      else pastList.push(enriched);
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
    if (
      !session?.user?.id ||
      !createState.createTitle.trim() ||
      !createState.createStartAt
    ) {
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
        title: createState.createTitle.trim(),
        description: createState.createDescription.trim() || null,
        start_at: createState.createStartAt,
        end_at: createState.createEndAt || null,
        location: createState.createLocation.trim() || null,
        location_type: createState.createLocationType || null,
        link_url: createState.createLinkUrl.trim() || null,
      });
      if (insertErr) throw insertErr;
      setCreateOpen(false);
      setCreateState(initialCreateState);
      await load();
    } catch (e: unknown) {
      setError(toMessage(e) || 'Failed to create event');
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
    <Box sx={{ flex: 1, pt: { xs: 2, md: 4 }, pb: 8 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            bgcolor: 'rgba(30, 30, 30, 0.65)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(156,187,217,0.22)',
            mb: 4,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
            sx={{ mb: 2 }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Events
            </Typography>
            {session && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{
                  textTransform: 'none',
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                Create Event
              </Button>
            )}
          </Stack>

          <EventsContent
            loading={loading}
            upcoming={upcoming}
            past={past}
            sessionPresent={Boolean(session)}
            onOpenCreate={() => setCreateOpen(true)}
            formatDate={formatDate}
          />
        </Paper>
      </Container>

      <CreateEventDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        state={createState}
        setState={(next) => setCreateState((prev) => ({ ...prev, ...next }))}
        error={error}
        submitting={submitting}
        onCreate={() => void handleCreate()}
      />
    </Box>
  );
};

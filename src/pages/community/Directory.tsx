import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { DirectoryRow } from '../../components/directory/DirectoryRow';
import type {
  ConnectionState,
  DirectoryMember,
  DirectorySort,
} from '../../lib/api/directoryApi';
import {
  acceptRequest,
  connectRequest,
  declineRequest,
  disconnect,
  fetchDirectory,
} from '../../lib/api/directoryApi';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';

const CARD_BG = 'rgba(30, 30, 30, 0.65)';
const PAGE_SIZE = 25;

export const Directory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const industry = searchParams.get('industry') ?? '';
  const location = searchParams.get('location') ?? '';
  const skillsParam = searchParams.get('skills') ?? '';
  const connectionStatus = searchParams.get('connection_status') ?? '';
  const sort = (searchParams.get('sort') as DirectorySort) || 'recently_active';

  const [rows, setRows] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const skills = useMemo(
    () => (skillsParam ? skillsParam.split(',').filter(Boolean) : []),
    [skillsParam],
  );

  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(updates)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const load = useCallback(
    async (append = false, appendOffset?: number) => {
      if (!session?.user?.id) return;
      const offset = append ? (appendOffset ?? 0) : 0;
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const { data, hasMore: more } = await fetchDirectory(supabase, {
          q: q.trim() || undefined,
          industry: industry || undefined,
          location: location || undefined,
          skills: skills.length ? skills : undefined,
          connection_status: (connectionStatus as ConnectionState) || undefined,
          sort,
          offset,
          limit: PAGE_SIZE,
        });
        if (append) {
          setRows((prev) => [...prev, ...data]);
        } else {
          setRows(data);
        }
        setHasMore(more);
      } catch (e: unknown) {
        const msg = toMessage(e);
        const isSearchContext = q.trim().length > 0;
        const isGenericError =
          msg.includes('Something went wrong') ||
          msg.includes('try again in a moment');
        setError(
          isSearchContext && isGenericError
            ? `No member found with that name. Please try a different search or try again.`
            : msg,
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [session?.user?.id, q, industry, location, skills, connectionStatus, sort],
  );

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(data.session as unknown as { user: { id: string } });
    };
    void init();
  }, []);

  useEffect(() => {
    if (session?.user?.id) void load(false);
  }, [session?.user?.id, load]);

  const handleConnect = async (id: string) => {
    setBusy(true);
    try {
      await connectRequest(supabase, id);
      await load(false);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (id: string) => {
    setBusy(true);
    try {
      await acceptRequest(supabase, id);
      await load(false);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async (id: string) => {
    setBusy(true);
    try {
      await declineRequest(supabase, id);
      await load(false);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnectClick = (member: DirectoryMember) => {
    setDisconnectTarget({
      id: member.id,
      name: member.display_name || member.handle || 'this member',
    });
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectTarget) return;
    setBusy(true);
    try {
      await disconnect(supabase, disconnectTarget.id);
      setDisconnectTarget(null);
      await load(false);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSkillClick = (skill: string) => {
    const next = skills.includes(skill) ? skills : [...skills, skill];
    updateUrl({ skills: next.join(',') });
  };

  if (!session && !loading) {
    return (
      <Box
        data-testid="directory-page"
        sx={{
          flex: 1,
          pt: 8,
          pb: 8,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Stack
          alignItems="center"
          spacing={2}
          data-testid="directory-sign-in-prompt"
        >
          <Typography variant="h5">Sign in to browse the Directory</Typography>
          <Button component={RouterLink} to="/" variant="contained">
            Sign in
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      data-testid="directory-page"
      sx={{ flex: 1, pt: { xs: 2, md: 4 }, pb: 8 }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            bgcolor: CARD_BG,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            mb: 4,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Discover Members
          </Typography>

          <Stack spacing={2}>
            {/* Search + Sort: row on md+, column on mobile (consistent structure) */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                placeholder="Search by name, tagline, industry, location, skills..."
                value={q}
                onChange={(e) => updateUrl({ q: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: 'rgba(0,0,0,0.3)',
                    borderRadius: 2,
                    '& fieldset': { border: '1px solid rgba(255,255,255,0.1)' },
                  },
                }}
                sx={{ flex: { md: 1 } }}
              />
              <FormControl size="small" sx={{ minWidth: { md: 140 } }}>
                <InputLabel>Sort</InputLabel>
                <Select
                  value={sort}
                  label="Sort"
                  onChange={(e) =>
                    updateUrl({ sort: e.target.value as DirectorySort })
                  }
                >
                  <MenuItem value="recently_active">Recently Active</MenuItem>
                  <MenuItem value="alphabetical">Alphabetical</MenuItem>
                  <MenuItem value="newest">Newest Members</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Filters: row on md+, stacked on mobile with full-width controls */}
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 1.5, md: 1 }}
              flexWrap="wrap"
              alignItems={{ xs: 'stretch', md: 'center' }}
              useFlexGap
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ alignSelf: { md: 'center' }, pt: { xs: 0.5, md: 0 } }}
              >
                Filters:
              </Typography>
              <TextField
                size="small"
                placeholder="Industry"
                value={industry}
                onChange={(e) => updateUrl({ industry: e.target.value })}
                sx={{ width: { xs: '100%', md: 120 } }}
              />
              <TextField
                size="small"
                placeholder="Location"
                value={location}
                onChange={(e) => updateUrl({ location: e.target.value })}
                sx={{ width: { xs: '100%', md: 140 } }}
              />
              <FormControl size="small" sx={{ width: { xs: '100%', md: 160 } }}>
                <InputLabel>Connection</InputLabel>
                <Select
                  value={connectionStatus}
                  label="Connection"
                  onChange={(e) =>
                    updateUrl({ connection_status: e.target.value })
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="not_connected">Not connected</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="pending_received">Pending received</MenuItem>
                  <MenuItem value="connected">Connected</MenuItem>
                </Select>
              </FormControl>
              {(!!industry ||
                !!location ||
                !!connectionStatus ||
                skills.length > 0) && (
                <Button
                  size="small"
                  onClick={() =>
                    updateUrl({
                      industry: '',
                      location: '',
                      connection_status: '',
                      skills: '',
                    })
                  }
                  sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                >
                  Clear filters
                </Button>
              )}
            </Stack>

            {skills.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {skills.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    size="small"
                    onDelete={() =>
                      updateUrl({
                        skills: skills.filter((x) => x !== s).join(','),
                      })
                    }
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={48} />
          </Box>
        ) : rows.length === 0 ? (
          <Paper
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: 4,
              bgcolor: 'rgba(18, 18, 18, 0.8)',
              border: '2px dashed rgba(255,255,255,0.1)',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              {q || industry || location || skills.length
                ? 'No member found'
                : 'No results'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {q || industry || location || skills.length
                ? q.trim()
                  ? `No member found with that name or filters. Try a different search or adjust your filters.`
                  : 'No members match your filters. Try adjusting them.'
                : 'The directory is empty.'}
            </Typography>
            <Button
              component={RouterLink}
              to="/join"
              variant="contained"
              sx={{ mt: 2 }}
            >
              Join the Community
            </Button>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {rows.map((member) => (
              <DirectoryRow
                key={member.id}
                member={member}
                onConnect={handleConnect}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onDisconnect={handleDisconnectClick}
                onSkillClick={handleSkillClick}
                busy={busy}
              />
            ))}
            {hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => load(true, rows.length)}
                  disabled={loadingMore}
                  startIcon={
                    loadingMore ? (
                      <CircularProgress size={20} />
                    ) : (
                      <FilterListIcon />
                    )
                  }
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </Container>

      <Dialog
        open={Boolean(disconnectTarget)}
        onClose={() => setDisconnectTarget(null)}
      >
        <DialogTitle>Disconnect?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove your connection with {disconnectTarget?.name}? You can send a
            new request later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDisconnectConfirm}
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

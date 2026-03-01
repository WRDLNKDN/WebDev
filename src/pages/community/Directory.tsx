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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  getSecondaryOptionsForPrimary,
  INDUSTRY_PRIMARY_OPTIONS,
} from '../../constants/industryTaxonomy';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  FILTER_CONTROL_MIN_HEIGHT,
  FILTER_CONTROL_WIDTH,
  filterSelectMenuProps,
  filterSelectSx,
} from '../../theme/filterControls';

const CARD_BG = 'rgba(30, 30, 30, 0.65)';
const PAGE_SIZE = 25;
const DIRECTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const DIRECTORY_CACHE_KEY_PREFIX = 'directory_cache_v1';
const DIRECTORY_SEARCH_MAX_CHARS = 500;

type DirectoryCachePayload = {
  rows: DirectoryMember[];
  hasMore: boolean;
  cachedAt: number;
};

export const Directory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const primaryIndustry = searchParams.get('primary_industry') ?? '';
  const secondaryIndustry = searchParams.get('secondary_industry') ?? '';
  const location = searchParams.get('location') ?? '';
  const skillsParam = searchParams.get('skills') ?? '';
  const connectionStatus = searchParams.get('connection_status') ?? '';
  const sort = searchParams.get('sort') ?? '';
  const [showSecondaryIndustryFilter, setShowSecondaryIndustryFilter] =
    useState(false);
  useEffect(() => {
    if (secondaryIndustry) setShowSecondaryIndustryFilter(true);
  }, [secondaryIndustry]);

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
  const hasInitialDataRef = useRef(false);

  const skills = useMemo(
    () => (skillsParam ? skillsParam.split(',').filter(Boolean) : []),
    [skillsParam],
  );
  const queryCacheKey = useMemo(
    () =>
      JSON.stringify({
        q: q.trim(),
        primaryIndustry,
        secondaryIndustry,
        location,
        skills,
        connectionStatus,
        sort: sort || 'recently_active',
      }),
    [
      q,
      primaryIndustry,
      secondaryIndustry,
      location,
      skills,
      connectionStatus,
      sort,
    ],
  );
  const directoryCacheKey = useMemo(
    () =>
      session?.user?.id
        ? `${DIRECTORY_CACHE_KEY_PREFIX}:${session.user.id}:${queryCacheKey}`
        : null,
    [session?.user?.id, queryCacheKey],
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
      const showInitialLoader = !append && !hasInitialDataRef.current;
      if (!append && showInitialLoader) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const { data, hasMore: more } = await fetchDirectory(supabase, {
          q: q.trim() || undefined,
          primary_industry: primaryIndustry || undefined,
          secondary_industry: secondaryIndustry || undefined,
          location: location || undefined,
          skills: skills.length ? skills : undefined,
          connection_status: (connectionStatus as ConnectionState) || undefined,
          sort: (sort || 'recently_active') as DirectorySort,
          offset,
          limit: PAGE_SIZE,
        });
        if (append) {
          setRows((prev) => [...prev, ...data]);
        } else {
          setRows(data);
          hasInitialDataRef.current = true;
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
        if (showInitialLoader) setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      session?.user?.id,
      q,
      primaryIndustry,
      secondaryIndustry,
      location,
      skills,
      connectionStatus,
      sort,
    ],
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
    hasInitialDataRef.current = false;
  }, [directoryCacheKey]);

  useEffect(() => {
    if (!directoryCacheKey) return;
    try {
      const raw = sessionStorage.getItem(directoryCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DirectoryCachePayload;
      if (
        !parsed ||
        !Array.isArray(parsed.rows) ||
        typeof parsed.hasMore !== 'boolean' ||
        typeof parsed.cachedAt !== 'number'
      ) {
        return;
      }
      if (Date.now() - parsed.cachedAt > DIRECTORY_CACHE_TTL_MS) return;
      setRows(parsed.rows);
      setHasMore(parsed.hasMore);
      hasInitialDataRef.current = true;
      setLoading(false);
    } catch {
      // Ignore malformed cache and fetch fresh data.
    }
  }, [directoryCacheKey]);

  useEffect(() => {
    if (!directoryCacheKey) return;
    const payload: DirectoryCachePayload = {
      rows,
      hasMore,
      cachedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(directoryCacheKey, JSON.stringify(payload));
    } catch {
      // Ignore storage write failures.
    }
  }, [directoryCacheKey, rows, hasMore]);

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
              <Box sx={{ flex: { md: 1 } }}>
                <TextField
                  fullWidth
                  placeholder="Search by name, tagline, industry, location, skills..."
                  value={q}
                  onChange={(e) =>
                    updateUrl({
                      q: e.target.value.slice(0, DIRECTORY_SEARCH_MAX_CHARS),
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    inputProps: {
                      maxLength: DIRECTORY_SEARCH_MAX_CHARS,
                    },
                    sx: {
                      bgcolor: 'rgba(0,0,0,0.3)',
                      borderRadius: 2,
                      '& fieldset': {
                        border: '1px solid rgba(255,255,255,0.1)',
                      },
                    },
                  }}
                />
                {q.length >= 450 && (
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      display: 'block',
                      textAlign: 'right',
                      color:
                        q.length >= DIRECTORY_SEARCH_MAX_CHARS
                          ? 'warning.light'
                          : 'text.secondary',
                    }}
                  >
                    {q.length}/{DIRECTORY_SEARCH_MAX_CHARS}
                  </Typography>
                )}
              </Box>
              <FormControl size="small" sx={filterSelectSx}>
                <InputLabel id="dir-sort" shrink>
                  Sort by
                </InputLabel>
                <Select
                  labelId="dir-sort"
                  value={sort}
                  label="Sort by"
                  displayEmpty
                  MenuProps={filterSelectMenuProps}
                  renderValue={(v) =>
                    v === 'recently_active'
                      ? 'Recently Active'
                      : v === 'alphabetical'
                        ? 'Alphabetical'
                        : v === 'newest'
                          ? 'Newest Members'
                          : ''
                  }
                  onChange={(e) => updateUrl({ sort: e.target.value })}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="recently_active">Recently Active</MenuItem>
                  <MenuItem value="alphabetical">Alphabetical</MenuItem>
                  <MenuItem value="newest">Newest Members</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Filters: row on md+, stacked on mobile; consistent control sizes */}
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 1.5, md: 1 }}
              flexWrap="wrap"
              alignItems={{ xs: 'stretch', md: 'center' }}
              useFlexGap
              sx={{ overflow: 'visible' }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  alignSelf: { md: 'center' },
                  pt: { xs: 0.5, md: 0 },
                  flexShrink: 0,
                }}
              >
                Filters:
              </Typography>
              <FormControl size="small" sx={filterSelectSx}>
                <InputLabel id="dir-primary-industry" shrink>
                  Primary Industry
                </InputLabel>
                <Select
                  labelId="dir-primary-industry"
                  value={primaryIndustry}
                  label="Primary Industry"
                  displayEmpty
                  MenuProps={filterSelectMenuProps}
                  onChange={(e) => {
                    const nextPrimary = e.target.value;
                    const allowed = getSecondaryOptionsForPrimary(nextPrimary);
                    updateUrl({
                      primary_industry: nextPrimary,
                      secondary_industry: allowed.includes(secondaryIndustry)
                        ? secondaryIndustry
                        : '',
                    });
                  }}
                  renderValue={(v) => v || ''}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {INDUSTRY_PRIMARY_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!showSecondaryIndustryFilter ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowSecondaryIndustryFilter(true)}
                  sx={{
                    textTransform: 'none',
                    minHeight: FILTER_CONTROL_MIN_HEIGHT,
                    minWidth: { xs: '100%', md: FILTER_CONTROL_WIDTH },
                    borderColor: 'rgba(255,255,255,0.23)',
                    color: 'text.primary',
                  }}
                >
                  Add sub-industry filter
                </Button>
              ) : (
                <>
                  <FormControl size="small" sx={filterSelectSx}>
                    <InputLabel id="dir-secondary-industry" shrink>
                      Sub-industry
                    </InputLabel>
                    <Select
                      labelId="dir-secondary-industry"
                      value={secondaryIndustry}
                      label="Sub-industry"
                      displayEmpty
                      MenuProps={filterSelectMenuProps}
                      onChange={(e) =>
                        updateUrl({ secondary_industry: e.target.value })
                      }
                      renderValue={(v) => v || ''}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {getSecondaryOptionsForPrimary(primaryIndustry).map(
                        (opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ),
                      )}
                    </Select>
                  </FormControl>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      updateUrl({ secondary_industry: '' });
                      setShowSecondaryIndustryFilter(false);
                    }}
                    sx={{
                      textTransform: 'none',
                      minHeight: FILTER_CONTROL_MIN_HEIGHT,
                      minWidth: { xs: '100%', md: FILTER_CONTROL_WIDTH },
                      borderColor: 'rgba(255,255,255,0.23)',
                      color: 'text.primary',
                    }}
                  >
                    Remove sub-industry
                  </Button>
                </>
              )}
              <Box
                sx={{
                  width: { xs: '100%', md: FILTER_CONTROL_WIDTH },
                  minWidth: { xs: 0, md: FILTER_CONTROL_WIDTH },
                  flexShrink: 0,
                }}
              >
                <TextField
                  size="small"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => updateUrl({ location: e.target.value })}
                  fullWidth
                  sx={{
                    '& .MuiInputBase-root': {
                      minHeight: FILTER_CONTROL_MIN_HEIGHT,
                      height: FILTER_CONTROL_MIN_HEIGHT,
                      boxSizing: 'border-box',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.23)',
                    },
                  }}
                />
              </Box>
              <FormControl size="small" sx={filterSelectSx}>
                <InputLabel id="dir-connection" shrink>
                  Connection
                </InputLabel>
                <Select
                  labelId="dir-connection"
                  value={connectionStatus}
                  label="Connection"
                  displayEmpty
                  MenuProps={filterSelectMenuProps}
                  renderValue={(v) =>
                    v === ''
                      ? ''
                      : v === 'not_connected'
                        ? 'Not connected'
                        : v === 'pending'
                          ? 'Pending'
                          : v === 'pending_received'
                            ? 'Pending received'
                            : v === 'connected'
                              ? 'Connected'
                              : v
                  }
                  onChange={(e) =>
                    updateUrl({ connection_status: e.target.value })
                  }
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="not_connected">Not connected</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="pending_received">Pending received</MenuItem>
                  <MenuItem value="connected">Connected</MenuItem>
                </Select>
              </FormControl>
              {(!!primaryIndustry ||
                !!secondaryIndustry ||
                !!location ||
                !!connectionStatus ||
                skills.length > 0) && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    updateUrl({
                      primary_industry: '',
                      secondary_industry: '',
                      location: '',
                      connection_status: '',
                      skills: '',
                    });
                    setShowSecondaryIndustryFilter(false);
                  }}
                  sx={{
                    textTransform: 'none',
                    minHeight: FILTER_CONTROL_MIN_HEIGHT,
                    minWidth: { xs: '100%', md: FILTER_CONTROL_WIDTH },
                    borderColor: 'rgba(255,255,255,0.23)',
                    color: 'text.primary',
                  }}
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

        {loading && rows.length === 0 ? (
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
              {q ||
              primaryIndustry ||
              secondaryIndustry ||
              location ||
              skills.length
                ? 'No member found'
                : 'No results'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {q ||
              primaryIndustry ||
              secondaryIndustry ||
              location ||
              skills.length
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

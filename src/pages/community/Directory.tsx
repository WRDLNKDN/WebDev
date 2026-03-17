import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { BlockConfirmDialog } from '../../components/chat/dialogs/BlockConfirmDialog';
import { DirectoryEmptyState } from '../../components/directory/DirectoryEmptyState';
import { DirectoryRow } from '../../components/directory/DirectoryRow';
import { useAppToast } from '../../context/AppToastContext';
import type {
  ConnectionState,
  DirectoryMember,
  DirectorySort,
} from '../../lib/api/directoryApi';
import {
  acceptRequest,
  cancelRequest,
  connectRequest,
  declineRequest,
  disconnect,
  fetchAllConnectedMembers,
  fetchDirectory,
} from '../../lib/api/directoryApi';
import {
  buildConnectionsCsv,
  downloadCsv,
} from '../../lib/directory/connectionsExportCsv';
import {
  getSecondaryOptionsForPrimary,
  INDUSTRY_PRIMARY_OPTIONS,
} from '../../constants/industryTaxonomy';
import {
  expandInterestFilterValues,
  INTEREST_CATEGORIES,
  INTEREST_OPTIONS_FLAT,
} from '../../constants/interestTaxonomy';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { filterSelectMenuProps } from '../../theme/filterControls';
import {
  FORM_FILTER_SELECT_SX,
  FORM_OUTLINED_FIELD_SX,
  FORM_SECTION_HEADING_SX,
  FORM_SECTION_PANEL_SX,
} from '../../lib/ui/formSurface';

const PAGE_SIZE = 25;
const DIRECTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const DIRECTORY_CACHE_KEY_PREFIX = 'directory_cache_v1';
const DIRECTORY_SEARCH_MAX_CHARS = 500;

const CONNECTION_LABEL: Record<string, string> = {
  not_connected: 'Not connected',
  pending: 'Pending',
  pending_received: 'Pending received',
  connected: 'Connected',
};
const DIRECTORY_CONNECTION_FILTERS: ConnectionState[] = [
  'not_connected',
  'connected',
];

type DirectoryCachePayload = {
  rows: DirectoryMember[];
  hasMore: boolean;
  cachedAt: number;
};

const FILTER_CONTROL_HEIGHT = 40;

// Shared sx for the chip-style filter controls in the filter row
const filterChipSx = {
  height: FILTER_CONTROL_HEIGHT,
  minHeight: FILTER_CONTROL_HEIGHT,
  borderRadius: 5,
  border: '1.5px solid rgba(141,188,229,0.34)',
  bgcolor: 'rgba(56,132,210,0.12)',
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 500,
  fontSize: '0.8rem',
  textTransform: 'none',
  px: 1.5,
  '&:hover': {
    bgcolor: 'rgba(156,187,217,0.22)',
    borderColor: 'rgba(141,188,229,0.50)',
  },
  '& .MuiButton-endIcon': { ml: 0.5 },
} as const;

// Select styled as a chip (no label, compact)
const chipSelectSx = {
  height: FILTER_CONTROL_HEIGHT,
  minHeight: FILTER_CONTROL_HEIGHT,
  borderRadius: 5,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(141,188,229,0.34)',
    borderWidth: '1.5px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(141,188,229,0.50)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#3884D2',
    borderWidth: '1.5px',
  },
  bgcolor: 'rgba(56,132,210,0.12)',
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 500,
  fontSize: '0.8rem',
  '& .MuiSelect-select': {
    py: '9px',
    px: 1.5,
    pr: '28px !important',
    display: 'flex',
    alignItems: 'center',
    minHeight: FILTER_CONTROL_HEIGHT,
    boxSizing: 'border-box',
  },
  '& .MuiSelect-icon': {
    color: 'rgba(255,255,255,0.5)',
    right: 6,
  },
} as const;

export const Directory = () => {
  const theme = useTheme();
  const isMobileFilters = useMediaQuery(theme.breakpoints.down('sm'));
  const { showToast } = useAppToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const primaryIndustry = searchParams.get('primary_industry') ?? '';
  const secondaryIndustry = searchParams.get('secondary_industry') ?? '';
  const location = searchParams.get('location') ?? '';
  const skillsParam = searchParams.get('skills') ?? '';
  const interestsParam = searchParams.get('interests') ?? '';
  const connectionStatus = searchParams.get('connection_status') ?? '';
  const sort = searchParams.get('sort') ?? 'recently_active';
  const normalizedConnectionStatus = DIRECTORY_CONNECTION_FILTERS.includes(
    connectionStatus as ConnectionState,
  )
    ? (connectionStatus as ConnectionState)
    : '';

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
  const [blockTarget, setBlockTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [exportingConnections, setExportingConnections] = useState(false);
  // Location filter inline edit state
  const [locationInput, setLocationInput] = useState(location);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const hasInitialDataRef = useRef(false);

  const skills = useMemo(
    () =>
      skillsParam
        ? skillsParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [skillsParam],
  );
  const interests = useMemo(
    () =>
      interestsParam
        ? interestsParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [interestsParam],
  );
  const interestsExpanded = useMemo(
    () => expandInterestFilterValues(interests),
    [interests],
  );
  const interestFilterOptions = useMemo(
    () => [
      ...INTEREST_CATEGORIES.filter((c) => c !== 'Other'),
      ...INTEREST_OPTIONS_FLAT.map((o) => o.label),
    ],
    [],
  );

  const queryCacheKey = useMemo(
    () =>
      JSON.stringify({
        q: q.trim(),
        primaryIndustry,
        secondaryIndustry,
        location,
        skills,
        interests,
        connectionStatus: normalizedConnectionStatus,
        sort,
      }),
    [
      q,
      primaryIndustry,
      secondaryIndustry,
      location,
      skills,
      interests,
      normalizedConnectionStatus,
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

  useEffect(() => {
    if (!connectionStatus || normalizedConnectionStatus) return;
    updateUrl({ connection_status: '' });
  }, [connectionStatus, normalizedConnectionStatus, updateUrl]);

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
          interests:
            interestsExpanded.length > 0 ? interestsExpanded : undefined,
          connection_status: normalizedConnectionStatus || undefined,
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
            ? 'No member found with that name. Please try a different search or try again.'
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
      interestsExpanded,
      normalizedConnectionStatus,
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
      )
        return;
      if (Date.now() - parsed.cachedAt > DIRECTORY_CACHE_TTL_MS) return;
      queueMicrotask(() => {
        setRows(parsed.rows);
        setHasMore(parsed.hasMore);
        hasInitialDataRef.current = true;
        setLoading(false);
      });
    } catch {
      /* ignore */
    }
  }, [directoryCacheKey]);

  useEffect(() => {
    if (!directoryCacheKey) return;
    try {
      sessionStorage.setItem(
        directoryCacheKey,
        JSON.stringify({ rows, hasMore, cachedAt: Date.now() }),
      );
    } catch {
      /* ignore */
    }
  }, [directoryCacheKey, rows, hasMore]);

  useEffect(() => {
    if (session?.user?.id) void load(false);
  }, [session?.user?.id, load]);

  // Sync location input when URL param changes externally (e.g. clear all)
  useEffect(() => {
    setLocationInput(location);
  }, [location]);

  const clearAllFilters = useCallback(
    (message?: string) => {
      updateUrl({
        q: '',
        primary_industry: '',
        secondary_industry: '',
        location: '',
        connection_status: '',
        skills: '',
        interests: '',
      });
      setLocationInput('');
      if (isMobileFilters) {
        setMobileControlsOpen(false);
      }
      if (message) {
        showToast({
          message,
          severity: 'info',
        });
      }
    },
    [isMobileFilters, showToast, updateUrl],
  );

  const handleConnect = async (id: string) => {
    setBusy(true);
    try {
      await connectRequest(supabase, id);
      await load(false);
      showToast({
        message: 'Connection request sent.',
        severity: 'success',
      });
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
      showToast({
        message: 'Connection accepted.',
        severity: 'success',
      });
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
      showToast({
        message: 'Connection request declined.',
        severity: 'info',
      });
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    setBusy(true);
    try {
      await cancelRequest(supabase, id);
      await load(false);
      showToast({
        message: 'Connection request cancelled.',
        severity: 'info',
      });
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
      showToast({
        message: 'Connection removed.',
        severity: 'info',
      });
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleBlockClick = (member: DirectoryMember) => {
    setBlockTarget({
      id: member.id,
      name: member.display_name || member.handle || 'this member',
    });
  };

  const handleBlockConfirm = async () => {
    if (!blockTarget || !session?.user?.id) return;
    setBusy(true);
    try {
      await supabase.from('chat_blocks').insert({
        blocker_id: session.user.id,
        blocked_user_id: blockTarget.id,
      });
      await disconnect(supabase, blockTarget.id);
      setRows((prev) => prev.filter((r) => r.id !== blockTarget.id));
      setBlockTarget(null);
      showToast({
        message: 'Member blocked.',
        severity: 'success',
      });
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

  const handleExportConnectionsCsv = useCallback(async () => {
    setExportingConnections(true);
    try {
      const members = await fetchAllConnectedMembers(supabase);
      const csv = buildConnectionsCsv(members, window.location.origin);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `connections-${date}.csv`);
      showToast({
        message: `Exported ${members.length} connection${members.length !== 1 ? 's' : ''}.`,
        severity: 'success',
      });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setExportingConnections(false);
    }
  }, [showToast]);

  const hasActiveFilters = !!(
    q.trim() ||
    primaryIndustry ||
    secondaryIndustry ||
    location ||
    normalizedConnectionStatus ||
    skills.length ||
    interests.length
  );
  useEffect(() => {
    if (!isMobileFilters) {
      setMobileControlsOpen(false);
      return;
    }
    if (hasActiveFilters) {
      setMobileControlsOpen(true);
    }
  }, [hasActiveFilters, isMobileFilters]);

  const activeFilterCount = [
    q.trim(),
    primaryIndustry,
    secondaryIndustry,
    location,
    normalizedConnectionStatus,
    ...skills,
    ...interests,
  ].filter(Boolean).length;

  const mobileControlsToggleLabel = mobileControlsOpen
    ? 'Hide filters'
    : 'Filters & sort';
  const resultsSummaryLabel =
    loading && rows.length === 0
      ? 'Loading members...'
      : rows.length === 0
        ? hasActiveFilters
          ? 'No matches for the current search and filters'
          : 'No members to show yet'
        : `${rows.length} ${rows.length === 1 ? 'member' : 'members'} ready to explore`;

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
      sx={{
        flex: 1,
        minWidth: 0,
        overflowX: 'hidden',
        pt: { xs: 1.5, md: 3 },
        pb: { xs: 4, md: 8 },
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: 'min(1120px, calc(100vw - 20px))',
          px: { xs: 1.25, sm: 2, md: 3 },
        }}
      >
        {/* Search + filter card */}
        <Paper
          elevation={0}
          sx={{
            ...FORM_SECTION_PANEL_SX,
            position: 'relative',
            overflow: 'hidden',
            p: { xs: 1.5, sm: 1.9, md: 2.3 },
            borderRadius: 4,
            backdropFilter: 'blur(16px)',
            mb: { xs: 1.25, md: 1.5 },
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 40px rgba(4,10,25,0.15)',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(135deg, rgba(56,132,210,0.16), rgba(56,132,210,0) 38%), linear-gradient(rgba(130,165,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(130,165,255,0.07) 1px, transparent 1px)',
              backgroundSize: 'auto, 26px 26px, 26px 26px',
              backgroundPosition: '0 0, -1px -1px, -1px -1px',
              opacity: 0.34,
            },
          }}
        >
          <Stack
            spacing={{ xs: 1.25, md: 1.35 }}
            sx={{ position: 'relative', zIndex: 1 }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{ ...FORM_SECTION_HEADING_SX, display: 'block', mb: 0.65 }}
              >
                Member Discovery
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 0.45,
                  fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.55rem' },
                }}
              >
                Discover Members
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(219,230,244,0.72)',
                  maxWidth: 680,
                  lineHeight: 1.55,
                }}
              >
                Search by name, skills, interests, industry, or location to find
                the right members faster.
              </Typography>
            </Box>

            {/* Search row */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 0.15 }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, tagline, industry, location, skills, interests..."
                value={q}
                onChange={(e) =>
                  updateUrl({
                    q: e.target.value.slice(0, DIRECTORY_SEARCH_MAX_CHARS),
                  })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 20 }}
                      />
                    </InputAdornment>
                  ),
                  inputProps: { maxLength: DIRECTORY_SEARCH_MAX_CHARS },
                }}
                sx={{
                  flex: 1,
                  ...FORM_OUTLINED_FIELD_SX,
                  '& .MuiOutlinedInput-root': {
                    height: 48,
                    minHeight: 48,
                    borderRadius: 2.75,
                    background:
                      'linear-gradient(180deg, rgba(8,18,34,0.92), rgba(8,18,34,0.8))',
                    boxShadow: '0 10px 24px rgba(3,8,20,0.22)',
                    '&:hover': {
                      boxShadow: '0 14px 28px rgba(3,8,20,0.28)',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(141,188,229,0.50)',
                    opacity: 1,
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Stack>

            {isMobileFilters && (
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 0.4 }}
              >
                <Button
                  variant="outlined"
                  startIcon={<TuneIcon />}
                  onClick={() => setMobileControlsOpen((prev) => !prev)}
                  data-testid="directory-mobile-controls-toggle"
                  aria-expanded={mobileControlsOpen}
                  sx={{
                    ...filterChipSx,
                    minWidth: 0,
                    px: 1.5,
                  }}
                >
                  {mobileControlsToggleLabel}
                </Button>
                {activeFilterCount > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}
                  >
                    {activeFilterCount} active
                  </Typography>
                )}
              </Stack>
            )}

            <Collapse in={!isMobileFilters || mobileControlsOpen}>
              <Box
                data-testid="directory-filters"
                sx={{
                  mt: 0.1,
                  p: { xs: 1.1, sm: 1.2, md: 1.3 },
                  borderRadius: 3,
                  bgcolor: 'rgba(7,15,28,0.58)',
                  border: '1px solid rgba(141,188,229,0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={0.75}
                  sx={{ mb: 1 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(191,214,239,0.72)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Refine results
                  </Typography>
                  {hasActiveFilters ? (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => clearAllFilters('Filters cleared.')}
                      sx={{
                        color: 'rgba(191,214,239,0.78)',
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        minWidth: 0,
                        px: 0.5,
                        '&:hover': {
                          color: '#fff',
                          bgcolor: 'transparent',
                        },
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255,255,255,0.42)' }}
                    >
                      Add filters to narrow the directory
                    </Typography>
                  )}
                </Stack>
                {isMobileFilters && (
                  <FormControl size="small" fullWidth sx={{ mb: 1.25 }}>
                    <InputLabel
                      id="dir-sort-mobile-label"
                      sx={{
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: '0.8rem',
                        top: '-2px',
                        '&.Mui-focused': { color: '#3b82f6' },
                        '&.MuiInputLabel-shrink': { top: 0 },
                      }}
                    >
                      Sort results
                    </InputLabel>
                    <Select
                      labelId="dir-sort-mobile-label"
                      label="Sort results"
                      value={sort}
                      onChange={(e) => updateUrl({ sort: e.target.value })}
                      MenuProps={filterSelectMenuProps}
                      sx={{
                        height: FILTER_CONTROL_HEIGHT,
                        minHeight: FILTER_CONTROL_HEIGHT,
                        ...FORM_FILTER_SELECT_SX,
                        '& .MuiSelect-select': {
                          py: '9px',
                          pl: 1.75,
                          pr: '32px !important',
                          minHeight: FILTER_CONTROL_HEIGHT,
                          boxSizing: 'border-box',
                        },
                      }}
                    >
                      <MenuItem value="recently_active">
                        Recently Active
                      </MenuItem>
                      <MenuItem value="alphabetical">Alphabetical</MenuItem>
                      <MenuItem value="newest">Newest Members</MenuItem>
                    </Select>
                  </FormControl>
                )}
                {/* Filter controls row: dropdowns together with location in the same toolbar */}
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  alignItems="center"
                  gap={1}
                  sx={{ rowGap: 1 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255,255,255,0.4)',
                      fontWeight: 600,
                      mr: 0.25,
                      flexShrink: 0,
                    }}
                  >
                    Filters:
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 1,
                      minWidth: 0,
                      flex: '1 1 560px',
                      '& .MuiInputBase-root': {
                        minWidth: { xs: '100%', sm: 150 },
                      },
                    }}
                  >
                    {/* Primary industry chip-select */}
                    <Select
                      value={primaryIndustry}
                      displayEmpty
                      inputProps={{ 'aria-label': 'Primary Industry' }}
                      renderValue={(v) => v || 'Primary Industry'}
                      onChange={(e) => {
                        const nextPrimary = e.target.value;
                        const allowed =
                          getSecondaryOptionsForPrimary(nextPrimary);
                        updateUrl({
                          primary_industry: nextPrimary,
                          secondary_industry: allowed.includes(
                            secondaryIndustry,
                          )
                            ? secondaryIndustry
                            : '',
                        });
                      }}
                      MenuProps={filterSelectMenuProps}
                      IconComponent={KeyboardArrowDownIcon}
                      sx={{
                        ...chipSelectSx,
                        '& .MuiSelect-select': {
                          ...chipSelectSx['& .MuiSelect-select'],
                          fontWeight: primaryIndustry ? 600 : 500,
                          color: primaryIndustry
                            ? '#fff'
                            : 'rgba(255,255,255,0.7)',
                          minWidth: 110,
                        },
                        ...(primaryIndustry
                          ? {
                              borderColor: '#3b82f6',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#3b82f6 !important',
                              },
                            }
                          : {}),
                      }}
                    >
                      <MenuItem value="">
                        <em>Any industry</em>
                      </MenuItem>
                      {INDUSTRY_PRIMARY_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>

                    {/* Sub-industry: show only after a primary industry is chosen */}
                    {primaryIndustry && (
                      <Select
                        value={secondaryIndustry}
                        displayEmpty
                        inputProps={{ 'aria-label': 'Sub-industry' }}
                        renderValue={(v) => v || 'Sub-industry'}
                        onChange={(e) =>
                          updateUrl({ secondary_industry: e.target.value })
                        }
                        MenuProps={filterSelectMenuProps}
                        IconComponent={KeyboardArrowDownIcon}
                        sx={{
                          ...chipSelectSx,
                          '& .MuiSelect-select': {
                            ...chipSelectSx['& .MuiSelect-select'],
                            fontWeight: secondaryIndustry ? 600 : 500,
                            color: secondaryIndustry
                              ? '#fff'
                              : 'rgba(255,255,255,0.7)',
                            minWidth: 100,
                          },
                          ...(secondaryIndustry
                            ? {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#3b82f6 !important',
                                },
                              }
                            : {}),
                        }}
                      >
                        <MenuItem value="">
                          <em>Any sub-industry</em>
                        </MenuItem>
                        {getSecondaryOptionsForPrimary(primaryIndustry).map(
                          (opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ),
                        )}
                      </Select>
                    )}

                    {/* Connection status chip-select */}
                    <Select
                      value={normalizedConnectionStatus}
                      displayEmpty
                      inputProps={{ 'aria-label': 'Connection' }}
                      renderValue={(v) =>
                        v ? (CONNECTION_LABEL[v] ?? v) : 'Connection'
                      }
                      onChange={(e) =>
                        updateUrl({ connection_status: e.target.value })
                      }
                      MenuProps={filterSelectMenuProps}
                      IconComponent={KeyboardArrowDownIcon}
                      sx={{
                        ...chipSelectSx,
                        '& .MuiSelect-select': {
                          ...chipSelectSx['& .MuiSelect-select'],
                          fontWeight: normalizedConnectionStatus ? 600 : 500,
                          color: normalizedConnectionStatus
                            ? '#fff'
                            : 'rgba(255,255,255,0.7)',
                          minWidth: 95,
                        },
                        ...(normalizedConnectionStatus
                          ? {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#3884D2 !important',
                              },
                            }
                          : {}),
                      }}
                    >
                      <MenuItem value="">
                        <em>Any</em>
                      </MenuItem>
                      <MenuItem value="not_connected">Not connected</MenuItem>
                      <MenuItem value="connected">Connected</MenuItem>
                    </Select>

                    {/* Interest multi-select: category or individual interest */}
                    <Select
                      multiple
                      displayEmpty
                      value={interests}
                      inputProps={{ 'aria-label': 'Interest' }}
                      renderValue={(selected) =>
                        selected.length > 0 ? selected.join(', ') : 'Interest'
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        const next =
                          typeof value === 'string' ? value.split(',') : value;
                        updateUrl({
                          interests: next.length > 0 ? next.join(',') : '',
                        });
                      }}
                      MenuProps={{
                        ...filterSelectMenuProps,
                        autoFocus: false,
                      }}
                      IconComponent={KeyboardArrowDownIcon}
                      sx={{
                        ...chipSelectSx,
                        minWidth: 120,
                        '& .MuiSelect-select': {
                          ...chipSelectSx['& .MuiSelect-select'],
                          fontWeight: interests.length ? 600 : 500,
                          color: interests.length
                            ? '#fff'
                            : 'rgba(255,255,255,0.7)',
                        },
                        ...(interests.length
                          ? {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#3b82f6 !important',
                              },
                            }
                          : {}),
                      }}
                    >
                      {interestFilterOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  {/* Location — kept inside the same filter toolbar */}
                  <Box
                    component="form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateUrl({ location: locationInput });
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: {
                        xs: '1 1 100%',
                        sm: '1 1 220px',
                        md: '0 1 240px',
                      },
                      width: '100%',
                    }}
                  >
                    <TextField
                      size="small"
                      placeholder="Location"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onBlur={() => updateUrl({ location: locationInput })}
                      sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                          ...chipSelectSx,
                          height: FILTER_CONTROL_HEIGHT,
                          minHeight: FILTER_CONTROL_HEIGHT,
                          color: locationInput
                            ? '#fff'
                            : 'rgba(255,255,255,0.7)',
                          '& fieldset': {
                            borderColor: locationInput
                              ? '#3b82f6'
                              : 'rgba(255,255,255,0.18)',
                            borderWidth: '1.5px',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)',
                          },
                          '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                          '& input': {
                            py: '9px',
                            px: 1.5,
                            minWidth: 80,
                            maxWidth: '100%',
                            fontWeight: locationInput ? 600 : 500,
                            boxSizing: 'border-box',
                          },
                          '& input::placeholder': {
                            color: 'rgba(255,255,255,0.5)',
                            opacity: 1,
                            fontSize: '0.8rem',
                          },
                        },
                      }}
                    />
                  </Box>
                </Stack>

                {/* Active filter chips row (query + skills + clear all) */}
                {hasActiveFilters && (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    alignItems="center"
                    gap={1}
                    sx={{ mt: 1.15 }}
                  >
                    {q.trim() && (
                      <Chip
                        data-testid="directory-active-filter-q"
                        size="small"
                        label={`"${q.length > 20 ? q.slice(0, 20) + '…' : q}"`}
                        onDelete={() => updateUrl({ q: '' })}
                        sx={{
                          bgcolor: 'rgba(59,130,246,0.15)',
                          border: '1px solid rgba(59,130,246,0.35)',
                          color: '#93c5fd',
                          height: 28,
                        }}
                      />
                    )}
                    {primaryIndustry && (
                      <Chip
                        data-testid="directory-active-filter-primary-industry"
                        size="small"
                        label={`Industry: ${primaryIndustry}`}
                        onDelete={() =>
                          updateUrl({
                            primary_industry: '',
                            secondary_industry: '',
                          })
                        }
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.75)',
                          height: 28,
                        }}
                      />
                    )}
                    {secondaryIndustry && (
                      <Chip
                        data-testid="directory-active-filter-secondary-industry"
                        size="small"
                        label={`Sub-industry: ${secondaryIndustry}`}
                        onDelete={() => updateUrl({ secondary_industry: '' })}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.75)',
                          height: 28,
                        }}
                      />
                    )}
                    {location && (
                      <Chip
                        data-testid="directory-active-filter-location"
                        size="small"
                        label={`Location: ${location}`}
                        onDelete={() => updateUrl({ location: '' })}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.75)',
                          height: 28,
                        }}
                      />
                    )}
                    {normalizedConnectionStatus && (
                      <Chip
                        data-testid="directory-active-filter-connection"
                        size="small"
                        label={`Connection: ${CONNECTION_LABEL[normalizedConnectionStatus] ?? normalizedConnectionStatus}`}
                        onDelete={() => updateUrl({ connection_status: '' })}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.75)',
                          height: 28,
                        }}
                      />
                    )}
                    {skills.map((s) => (
                      <Chip
                        key={s}
                        data-testid={`directory-active-filter-skill-${s}`}
                        size="small"
                        label={s}
                        onDelete={() =>
                          updateUrl({
                            skills: skills.filter((x) => x !== s).join(','),
                          })
                        }
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.75)',
                          height: 28,
                        }}
                      />
                    ))}
                    {interests.map((i) => (
                      <Chip
                        key={i}
                        data-testid={`directory-active-filter-interest-${i}`}
                        size="small"
                        label={i}
                        onDelete={() =>
                          updateUrl({
                            interests: interests
                              .filter((x) => x !== i)
                              .join(','),
                          })
                        }
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.75)',
                          height: 28,
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </Collapse>
          </Stack>
        </Paper>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 1.5 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3.5,
            overflow: 'hidden',
            bgcolor: 'rgba(10,16,28,0.74)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(14px)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(2,8,20,0.16)',
            animation: 'directoryResultsFade 180ms ease-out',
            '@keyframes directoryResultsFade': {
              from: { opacity: 0, transform: 'translateY(6px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <Box
            key={`results-toolbar-${queryCacheKey}`}
            data-testid="directory-results-toolbar"
            sx={{
              px: { xs: 1.25, sm: 1.5, md: 1.9 },
              py: { xs: 1.2, md: 1.3 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background:
                'linear-gradient(180deg, rgba(14,24,42,0.86), rgba(10,16,28,0.74))',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '0.08em',
                  lineHeight: 1.2,
                }}
              >
                Results
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
              >
                {resultsSummaryLabel}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(191,214,239,0.58)' }}
              >
                Search first, then refine with filters below.
              </Typography>
            </Box>

            {normalizedConnectionStatus === 'connected' && (
              <Tooltip title="Download your connections as a CSV file">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      exportingConnections ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <FileDownloadIcon />
                      )
                    }
                    onClick={() => void handleExportConnectionsCsv()}
                    disabled={exportingConnections}
                    data-testid="directory-export-connections-csv"
                    aria-label="Export connections to CSV"
                    sx={{
                      ...filterChipSx,
                      minWidth: 0,
                      px: 1.5,
                    }}
                  >
                    Export CSV
                  </Button>
                </span>
              </Tooltip>
            )}
            {isMobileFilters ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<TuneIcon />}
                onClick={() => setMobileControlsOpen((prev) => !prev)}
                data-testid="directory-mobile-toolbar-toggle"
                aria-expanded={mobileControlsOpen}
                sx={{
                  ...filterChipSx,
                  minWidth: 0,
                  px: 1.5,
                }}
              >
                {mobileControlsToggleLabel}
              </Button>
            ) : (
              <FormControl
                size="small"
                sx={{
                  flexShrink: 0,
                  minWidth: { xs: '100%', sm: 220 },
                  pt: 0.35,
                }}
              >
                <InputLabel
                  id="dir-sort-label"
                  sx={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: '0.8rem',
                    top: 1,
                    '&.Mui-focused': { color: '#3b82f6' },
                    '&.MuiInputLabel-shrink': { top: 2 },
                  }}
                >
                  Sort results
                </InputLabel>
                <Select
                  labelId="dir-sort-label"
                  label="Sort results"
                  value={sort}
                  onChange={(e) => updateUrl({ sort: e.target.value })}
                  MenuProps={filterSelectMenuProps}
                  sx={{
                    height: FILTER_CONTROL_HEIGHT,
                    minHeight: FILTER_CONTROL_HEIGHT,
                    ...FORM_FILTER_SELECT_SX,
                    '& .MuiSelect-select': {
                      py: '9px',
                      pl: 1.75,
                      pr: '32px !important',
                      minHeight: FILTER_CONTROL_HEIGHT,
                      boxSizing: 'border-box',
                    },
                  }}
                >
                  <MenuItem value="recently_active">Recently Active</MenuItem>
                  <MenuItem value="alphabetical">Alphabetical</MenuItem>
                  <MenuItem value="newest">Newest Members</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          <Box
            sx={{
              px: { xs: 1, sm: 1.25, md: 1.4 },
              py: { xs: 1.1, md: 1.35 },
              minHeight: rows.length === 0 ? { xs: 320, md: 380 } : undefined,
            }}
          >
            {/* Results */}
            {loading && rows.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={40} />
              </Box>
            ) : rows.length === 0 ? (
              <Box
                key={`results-empty-${queryCacheKey}`}
                sx={{
                  px: { xs: 0.1, sm: 0.35, md: 0.5 },
                  py: { xs: 0.35, md: 0.5 },
                  height: '100%',
                }}
              >
                <DirectoryEmptyState
                  hasActiveFilters={hasActiveFilters}
                  isSearchActive={q.trim().length > 0}
                  onClearFilters={() => clearAllFilters('Filters cleared.')}
                  clearFiltersLabel="Clear filters"
                />
              </Box>
            ) : (
              <Stack
                key={`results-list-${queryCacheKey}`}
                spacing={0.55}
                sx={{ animation: 'directoryResultsFade 180ms ease-out' }}
              >
                {rows.map((member) => (
                  <DirectoryRow
                    key={member.id}
                    member={member}
                    onConnect={handleConnect}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    onCancelRequest={handleCancelRequest}
                    onDisconnect={handleDisconnectClick}
                    onBlock={handleBlockClick}
                    onSkillClick={handleSkillClick}
                    busy={busy}
                  />
                ))}
                {hasMore && (
                  <Box
                    sx={{ display: 'flex', justifyContent: 'center', py: 2 }}
                  >
                    <Button
                      variant="outlined"
                      onClick={() => void load(true, rows.length)}
                      disabled={loadingMore}
                      sx={{
                        borderColor: 'rgba(141,188,229,0.38)',
                        color: 'rgba(255,255,255,0.7)',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': {
                          borderColor: 'rgba(255,255,255,0.4)',
                          bgcolor: 'rgba(56,132,210,0.10)',
                        },
                      }}
                    >
                      {loadingMore ? (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                      ) : null}
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </Button>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Paper>
      </Container>

      <Dialog
        open={Boolean(disconnectTarget)}
        onClose={() => setDisconnectTarget(null)}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          Disconnect from {disconnectTarget?.name}
          <Tooltip title="Close">
            <IconButton
              aria-label="Close"
              onClick={() => setDisconnectTarget(null)}
              sx={{ color: 'rgba(255,255,255,0.75)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent>
          <Typography>
            This will remove your connection. You can reconnect later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleDisconnectConfirm()}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <BlockConfirmDialog
        open={Boolean(blockTarget)}
        onClose={() => setBlockTarget(null)}
        onConfirm={handleBlockConfirm}
        displayName={blockTarget?.name}
      />
    </Box>
  );
};

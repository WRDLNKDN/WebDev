import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddIcon from '@mui/icons-material/Add';
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
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { BlockConfirmDialog } from '../../components/chat/dialogs/BlockConfirmDialog';
import { DirectoryRow } from '../../components/directory/DirectoryRow';
import { useAppToast } from '../../context/AppToastContext';
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
  border: '1.5px solid rgba(255,255,255,0.18)',
  bgcolor: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 500,
  fontSize: '0.8rem',
  textTransform: 'none',
  px: 1.5,
  '&:hover': {
    bgcolor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  '& .MuiButton-endIcon': { ml: 0.5 },
} as const;

// Select styled as a chip (no label, compact)
const chipSelectSx = {
  height: FILTER_CONTROL_HEIGHT,
  minHeight: FILTER_CONTROL_HEIGHT,
  borderRadius: 5,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: '1.5px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#3b82f6',
    borderWidth: '1.5px',
  },
  bgcolor: 'rgba(255,255,255,0.05)',
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
  const connectionStatus = searchParams.get('connection_status') ?? '';
  const sort = searchParams.get('sort') ?? 'recently_active';

  const [showSecondaryIndustryFilter, setShowSecondaryIndustryFilter] =
    useState(false);
  useEffect(() => {
    setShowSecondaryIndustryFilter(
      Boolean(primaryIndustry || secondaryIndustry),
    );
  }, [primaryIndustry, secondaryIndustry]);

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
  // Location filter inline edit state
  const [locationInput, setLocationInput] = useState(location);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
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
        sort,
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
      });
      setShowSecondaryIndustryFilter(false);
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

  const hasActiveFilters = !!(
    q.trim() ||
    primaryIndustry ||
    secondaryIndustry ||
    location ||
    connectionStatus ||
    skills.length
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
    connectionStatus,
    ...skills,
  ].filter(Boolean).length;

  const mobileControlsToggleLabel = mobileControlsOpen
    ? 'Hide filters'
    : 'Filters & sort';

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
      <Container maxWidth="lg" sx={{ px: { xs: 1.25, sm: 2, md: 3 } }}>
        {/* Search + filter card */}
        <Paper
          elevation={0}
          sx={{
            ...FORM_SECTION_PANEL_SX,
            p: { xs: 1.75, sm: 2, md: 2.25 },
            borderRadius: 3,
            backdropFilter: 'blur(16px)',
            mb: 1.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{ ...FORM_SECTION_HEADING_SX, display: 'block', mb: 0.75 }}
          >
            Member Discovery
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 1.5,
              fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.5rem' },
            }}
          >
            Discover Members
          </Typography>

          {/* Search row */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1.25 }}
          >
            <TextField
              fullWidth
              size="small"
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
                  height: FILTER_CONTROL_HEIGHT,
                  minHeight: FILTER_CONTROL_HEIGHT,
                  borderRadius: 2,
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.3)',
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
              sx={{ mb: 1 }}
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
            <Box data-testid="directory-filters">
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
                    <MenuItem value="recently_active">Recently Active</MenuItem>
                    <MenuItem value="alphabetical">Alphabetical</MenuItem>
                    <MenuItem value="newest">Newest Members</MenuItem>
                  </Select>
                </FormControl>
              )}
              {/* Filter controls row: dropdowns together, location on far right */}
              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="center"
                gap={1}
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
                        secondary_industry: allowed.includes(secondaryIndustry)
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

                  {/* Sub-industry: only show if primary is set OR already active */}
                  {primaryIndustry || showSecondaryIndustryFilter ? (
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
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        <AddIcon sx={{ fontSize: '0.9rem !important' }} />
                      }
                      onClick={() => setShowSecondaryIndustryFilter(true)}
                      sx={filterChipSx}
                    >
                      Add secondary filter
                    </Button>
                  )}

                  {/* Connection status chip-select */}
                  <Select
                    value={connectionStatus}
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
                        fontWeight: connectionStatus ? 600 : 500,
                        color: connectionStatus
                          ? '#fff'
                          : 'rgba(255,255,255,0.7)',
                        minWidth: 95,
                      },
                      ...(connectionStatus
                        ? {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#3b82f6 !important',
                            },
                          }
                        : {}),
                    }}
                  >
                    <MenuItem value="">
                      <em>Any</em>
                    </MenuItem>
                    <MenuItem value="not_connected">Not connected</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="pending_received">
                      Pending received
                    </MenuItem>
                    <MenuItem value="connected">Connected</MenuItem>
                  </Select>
                </Box>

                {/* Location — pushed to the right on wider screens */}
                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateUrl({ location: locationInput });
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    ml: { md: 'auto' },
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Location"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onBlur={() => updateUrl({ location: locationInput })}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      '& .MuiOutlinedInput-root': {
                        ...chipSelectSx,
                        height: FILTER_CONTROL_HEIGHT,
                        minHeight: FILTER_CONTROL_HEIGHT,
                        color: locationInput ? '#fff' : 'rgba(255,255,255,0.7)',
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
                          maxWidth: { xs: '100%', sm: 180 },
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
                  sx={{ mt: 1 }}
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
                  {connectionStatus && (
                    <Chip
                      data-testid="directory-active-filter-connection"
                      size="small"
                      label={`Connection: ${CONNECTION_LABEL[connectionStatus] ?? connectionStatus}`}
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

                  {/* Clear all */}
                  {hasActiveFilters && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => clearAllFilters('Filters cleared.')}
                      sx={{
                        color: 'rgba(255,255,255,0.4)',
                        textTransform: 'none',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        px: 0.5,
                        '&:hover': {
                          color: 'rgba(255,255,255,0.7)',
                          bgcolor: 'transparent',
                        },
                      }}
                    >
                      Clear all
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          </Collapse>
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
          key={`results-toolbar-${queryCacheKey}`}
          elevation={0}
          data-testid="directory-results-toolbar"
          sx={{
            px: { xs: 1.25, sm: 1.5, md: 1.75 },
            py: 1,
            mb: 1,
            borderRadius: 2,
            bgcolor: 'rgba(10,16,28,0.72)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.25,
            flexWrap: 'wrap',
            position: { xs: 'static', md: 'sticky' },
            top: { md: 8 },
            zIndex: 2,
            backdropFilter: 'blur(14px)',
            animation: 'directoryResultsFade 180ms ease-out',
            '@keyframes directoryResultsFade': {
              from: { opacity: 0, transform: 'translateY(6px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
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
              sx={{ color: 'rgba(255,255,255,0.84)' }}
            >
              {loading && rows.length === 0
                ? 'Loading members...'
                : `${rows.length} ${rows.length === 1 ? 'member' : 'members'}`}
            </Typography>
          </Box>

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
              sx={{ flexShrink: 0, minWidth: { xs: '100%', sm: 190 } }}
            >
              <InputLabel
                id="dir-sort-label"
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
        </Paper>

        {/* Results */}
        {loading && rows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={40} />
          </Box>
        ) : rows.length === 0 ? (
          <Paper
            key={`results-empty-${queryCacheKey}`}
            elevation={0}
            sx={{
              py: { xs: 6, md: 8 },
              px: 4,
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: 'rgba(18,22,36,0.7)',
              border: '1px dashed rgba(255,255,255,0.1)',
              animation: 'directoryResultsFade 180ms ease-out',
            }}
            data-testid="directory-empty-state"
          >
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
              {hasActiveFilters ? 'No members found' : 'No results'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {hasActiveFilters
                ? 'No members match your filters.'
                : 'The directory is empty.'}
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              justifyContent="center"
              alignItems="center"
              flexWrap="wrap"
            >
              {hasActiveFilters && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => clearAllFilters('Filters cleared.')}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 4,
                    py: 1.25,
                    borderRadius: 2,
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'rgba(255,255,255,0.9)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.5)',
                      bgcolor: 'rgba(255,255,255,0.06)',
                    },
                  }}
                  data-testid="directory-clear-filters"
                >
                  Clear filters
                </Button>
              )}
            </Stack>
          </Paper>
        ) : (
          <Stack
            key={`results-list-${queryCacheKey}`}
            spacing={0.9}
            sx={{ animation: 'directoryResultsFade 180ms ease-out' }}
          >
            {rows.map((member) => (
              <DirectoryRow
                key={member.id}
                member={member}
                onConnect={handleConnect}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onDisconnect={handleDisconnectClick}
                onBlock={handleBlockClick}
                onSkillClick={handleSkillClick}
                busy={busy}
              />
            ))}
            {hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => void load(true, rows.length)}
                  disabled={loadingMore}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.7)',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.4)',
                      bgcolor: 'rgba(255,255,255,0.04)',
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
      </Container>

      <Dialog
        open={Boolean(disconnectTarget)}
        onClose={() => setDisconnectTarget(null)}
      >
        <DialogTitle>Disconnect from {disconnectTarget?.name}</DialogTitle>
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

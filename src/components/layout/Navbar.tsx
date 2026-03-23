import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CampaignIcon from '@mui/icons-material/Campaign';
import EventIcon from '@mui/icons-material/Event';
import ForumIcon from '@mui/icons-material/Forum';
import GavelIcon from '@mui/icons-material/Gavel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import {
  AppBar,
  Backdrop,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Toolbar,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useAppToast } from '../../context/AppToastContext';
import { useNotificationsUnread } from '../../hooks/useNotificationsUnread';
import { signOut } from '../../lib/auth/signOut';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  useFeatureFlag,
  useProductionComingSoonMode,
} from '../../context/FeatureFlagsContext';
import { GROUPS_FLAG } from '../../lib/featureFlags/keys';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import { chatUiForMember } from '../../lib/utils/chatUiForMember';
import { toMessage } from '../../lib/utils/errors';
import { denseMenuPaperSxFromTheme } from '../../lib/ui/formSurface';
import { getNavbarGlass } from '../../theme/candyStyles';
import { ProfileAvatar } from '../avatar/ProfileAvatar';
import {
  GODADDY_STOREFRONT_URL,
  resolveStoreExternalUrl,
} from '../../lib/marketing/storefront';

/** Store: resolved URL (GoDaddy when live, else Ecwid / VITE_STORE_URL); opens in a new tab. */

/** One row in the navbar search dropdown (approved profiles only). */
type SearchMatch = {
  id: string;
  handle: string | null;
  display_name: string | null;
};

/** Search: debounce before fetching; min chars to trigger; max rows in dropdown. */
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_MATCHES = 8;
const SEARCH_MAX_QUERY_CHARS = 500;

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const forcePublicHeader = path.startsWith('/join');
  const isFeedActive = path === '/feed';
  const isJoinActive = path.startsWith('/join');
  const productionComingSoon = useProductionComingSoonMode();
  const isDirectoryActive =
    path === '/directory' || path.startsWith('/directory');
  const isAdminActive = path.startsWith('/admin');
  const eventsEnabled = useFeatureFlag('events');
  const directoryEnabled = useFeatureFlag('directory');
  const storeEnabled = useFeatureFlag('store');
  const chatEnabled = useFeatureFlag('chat');
  const groupsEnabled = useFeatureFlag(GROUPS_FLAG);
  const gamesEnabled = useFeatureFlag('games');
  const feedEnabled = useFeatureFlag('feed');
  const dashboardEnabled = useFeatureFlag('dashboard');
  const isDashboardActive =
    path === '/dashboard' || path.startsWith('/dashboard/');

  const [storeHref, setStoreHref] = useState(GODADDY_STOREFRONT_URL);

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [profileOnboarded, setProfileOnboarded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Search: query string, dropdown matches from Supabase, open state, refs for Popper and debounce. */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const searchPopperRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [joinLoading, setJoinLoading] = useState(false);
  const theme = useTheme();
  const isLightNav = theme.palette.mode === 'light';
  const drawerPaperSx = {
    width: 280,
    bgcolor: isLightNav
      ? theme.palette.background.paper
      : 'rgba(18, 18, 18, 0.98)',
    borderRight: isLightNav
      ? `1px solid ${theme.palette.divider}`
      : '1px solid rgba(156,187,217,0.18)',
  };
  const drawerLinkColor = isLightNav ? 'text.primary' : 'white';
  const drawerActiveNavSx = isLightNav
    ? {
        bgcolor: alpha(theme.palette.primary.main, 0.12),
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18) },
      }
    : {
        bgcolor: 'rgba(156,187,217,0.26)',
        '&:hover': { bgcolor: 'rgba(141,188,229,0.34)' },
      };
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isCompactDesktop = useMediaQuery(theme.breakpoints.down('lg'));
  const { avatarUrl } = useCurrentUserAvatar();
  const notificationsUnread = useNotificationsUnread();
  const { showToast } = useAppToast();
  const isEventsActive = path === '/events' || path.startsWith('/events/');
  const isGroupsActive = path === '/groups' || path.startsWith('/groups/');
  const isHomePath = path === '/' || path === '/home';
  /** Coming soon + home: logo-only chrome — no hamburger, no Join/Sign-in spinner (mobile can hang on getSession). */
  const minimalComingSoonHomeNavbar =
    productionComingSoon && !isAdminActive && isHomePath;
  /** Avatar menu must mount for both desktop and mobile headers (mobile had anchor + no Menu = dead clicks). */
  const showHeaderAccountDropdown =
    Boolean(session) &&
    sessionLoaded &&
    onboardingLoaded &&
    (!productionComingSoon || isAdminActive) &&
    path !== '/auth/callback' &&
    !minimalComingSoonHomeNavbar;
  // Show authed header if session exists and either:
  // 1. Profile is confirmed onboarded, OR
  // 2. Onboarding check is still loading (fail-open to show icon while checking)
  // Coming soon mode hides ALL auth UI (including avatar) - only show on admin routes
  const showAuthedHeader =
    Boolean(session) &&
    (profileOnboarded || !onboardingLoaded) &&
    !forcePublicHeader &&
    (!productionComingSoon || isAdminActive);

  // Auth session: IF session exists we show Feed/Dashboard/Sign Out; ELSE Join + Sign in
  // NOTE: Supabase may recover session from OAuth URL before our listener is registered, so we
  // retry getSession when null to avoid "stuck on Sign in" after returning from OAuth.
  useEffect(() => {
    let cancelled = false;

    const refreshSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setSession(data.session ?? null);
          setSessionLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setSessionLoaded(true);
        }
      }
    };

    void refreshSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt, newSession) => {
        if (!cancelled) {
          setSession(newSession ?? null);
          setSessionLoaded(true);
        }
      },
    );

    // Retries when null: catches OAuth callback race where session recovery completes
    // before our listener was attached (SIGNED_IN fires, we miss it). UAT can be slow.
    const retries = [600, 1200];
    const retryTimers = retries.map((delay) =>
      setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          if (data.session) setSession(data.session);
          setSessionLoaded(true);
        }
      }, delay),
    );

    // Guard: never await getSession again here — on slow mobile networks a second hung
    // getSession() left sessionLoaded false forever (perpetual navbar spinner).
    const sessionGuardTimer = setTimeout(() => {
      if (!cancelled) {
        setSessionLoaded(true);
      }
    }, 3000);

    return () => {
      cancelled = true;
      retryTimers.forEach(clearTimeout);
      clearTimeout(sessionGuardTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkOnboarding = async () => {
      if (forcePublicHeader) {
        if (!cancelled) {
          setProfileOnboarded(false);
          setOnboardingLoaded(true);
        }
        return;
      }
      if (!session?.user?.id) {
        if (!cancelled) {
          setProfileOnboarded(false);
          setOnboardingLoaded(true);
        }
        return;
      }
      setOnboardingLoaded(false);
      try {
        const { data } = await supabase
          .from('profiles')
          .select(
            'display_name, join_reason, participation_style, policy_version',
          )
          .eq('id', session.user.id)
          .maybeSingle();
        if (!cancelled) {
          setProfileOnboarded(Boolean(data && isProfileOnboarded(data)));
          setOnboardingLoaded(true);
        }
      } catch {
        if (!cancelled) {
          // Fail-open on profile read errors so signed-in members are not
          // incorrectly treated as signed-out due transient fetch issues.
          setProfileOnboarded(true);
          setOnboardingLoaded(true);
        }
      }
    };
    void checkOnboarding();

    // Guard: if profile fetch hangs, stop showing spinner and treat as onboarded
    const onboardingGuardTimer = setTimeout(() => {
      if (!cancelled) {
        setProfileOnboarded(true);
        setOnboardingLoaded(true);
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(onboardingGuardTimer);
    };
  }, [forcePublicHeader, session?.user?.id]);

  // Re-fetch session when navigating away from /auth/callback (AuthCallback just established it)
  const prevPathRef = useRef(path);
  useEffect(() => {
    if (prevPathRef.current === '/auth/callback' && path !== '/auth/callback') {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setSessionLoaded(true);
        }
      })();
    }
    prevPathRef.current = path;
  }, [path]);

  // Admin: IF session exists, check is_admin RPC; ELSE not admin
  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      if (!session) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = (await supabase.rpc('is_admin')) as {
          data: boolean | null;
          error: Error | null;
        };
        if (cancelled) return;

        setIsAdmin(!error && data === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const closeSearchDropdown = useCallback(() => {
    setSearchOpen(false);
  }, []);

  // Search: close dropdown when clicking outside
  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchAnchorEl?.contains(target) ||
        searchPopperRef.current?.contains(target)
      )
        return;
      closeSearchDropdown();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen, searchAnchorEl, closeSearchDropdown]);

  // Search: debounced fetch of approved profiles, then filter client-side by handle/display_name for dropdown.
  useEffect(() => {
    if (!showAuthedHeader) {
      setSearchMatches([]);
      setSearchOpen(false);
      setSearchLoading(false);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      return;
    }
    const term = searchQuery.trim().toLowerCase();
    if (term.length < SEARCH_MIN_LENGTH) {
      setSearchMatches([]);
      setSearchOpen(false);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      searchDebounceRef.current = null;
      setSearchLoading(true);
      setSearchOpen(true);
      let list: SearchMatch[] = [];
      // RLS: authenticated users see approved profiles + their own (so you can find yourself).
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, display_name')
        .limit(200);
      if (!error && data) {
        list = data as SearchMatch[];
      }
      const filtered = list
        .filter((p) => {
          const h = (p.handle || '').toLowerCase();
          const n = (p.display_name || '').toLowerCase();
          return h.includes(term) || n.includes(term);
        })
        .slice(0, SEARCH_MAX_MATCHES);
      setSearchMatches(filtered);
      setSearchLoading(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, showAuthedHeader]);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut({ redirectTo: '/' });
      setSession(null);
      navigate('/', { replace: true });
    } catch (error) {
      console.error(error);
      showToast({ message: toMessage(error), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const openJoin = useCallback(async () => {
    if (path === '/join') {
      setJoinLoading(false);
      return;
    }
    setDrawerOpen(false);
    setJoinLoading(true);
    try {
      // Warm the Join chunk so members get instant feedback.
      await import('../../pages/auth/Join');
    } catch {
      // Navigation still proceeds even if preload fails.
    } finally {
      navigate('/join');
    }
  }, [navigate, path]);

  const openSignIn = useCallback(async () => {
    if (path === '/signin') return;
    setDrawerOpen(false);
    try {
      await import('../../pages/auth/SignIn');
    } catch {
      // Navigation still proceeds even if preload fails.
    } finally {
      navigate('/signin');
    }
  }, [navigate, path]);

  useEffect(() => {
    if (path === '/join') {
      setJoinLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (path === '/signin' || path === '/join') {
      setDrawerOpen(false);
    }
  }, [path]);

  useEffect(() => {
    if (!storeEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const url = await resolveStoreExternalUrl();
        if (!cancelled) setStoreHref(url);
      } catch {
        if (!cancelled) setStoreHref(GODADDY_STOREFRONT_URL);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeEnabled]);

  return (
    <>
      <AppBar
        component="nav"
        position="sticky"
        color="transparent"
        elevation={0}
        sx={(theme) => ({
          ...getNavbarGlass(theme),
          zIndex: 1100,
          isolation: 'isolate',
        })}
      >
        <Toolbar
          sx={{
            py: 0.5,
            px: { xs: 0.75, sm: 1.25, md: 1.5 },
            minHeight: { xs: 48, sm: 56 },
            gap: { xs: 0.35, sm: 0.75, md: 1 },
            overflow: 'visible',
            ...(isMobile &&
              minimalComingSoonHomeNavbar && {
                justifyContent: 'flex-start',
              }),
          }}
        >
          {/* Mobile: hamburger — hidden on home during coming soon (video + text only) */}
          {isMobile && !minimalComingSoonHomeNavbar && (
            <Tooltip title="Open menu">
              <IconButton
                color="inherit"
                aria-label="Open menu"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 0.5 }}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Left: logo (home) + search — shrink on mobile so Join/Sign in stay visible */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0}
            sx={{
              mr: isMobile ? 0.5 : 2,
              minHeight: { xs: 40, sm: 48 },
              gap: isCompactDesktop ? 1.25 : 3,
              overflow: 'visible',
              flexShrink: isMobile ? 1 : 0,
              minWidth: 0,
            }}
          >
            {/* Brand: logo links to home — compact on mobile to avoid squishing nav */}
            <Box
              component={RouterLink}
              to="/"
              aria-label="Go to home"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                height: { xs: 36, sm: 40 },
                flexShrink: isMobile ? 1 : 0,
                minWidth: 0,
                borderRadius: 1,
                py: 0.5,
                px: 0.5,
                bgcolor: 'rgba(0,0,0,0.35)',
                transition: 'opacity 0.2s, background-color 0.2s',
                overflow: 'hidden',
                '&:hover': { opacity: 0.9, bgcolor: 'rgba(0,0,0,0.5)' },
              }}
            >
              <Box
                component="img"
                src="/assets/wrdlnkdn_logo.png"
                alt=""
                width={120}
                height={30}
                sx={{
                  height: { xs: 22, sm: 26, md: 30 },
                  width: 'auto',
                  maxWidth: { xs: 110, sm: 160, md: 200 },
                  objectFit: 'contain',
                }}
              />
            </Box>
            {/* Coming-soon mobile: Store in flow with logo (left), same chip treatment as logo — avoids absolute hit-area issues */}
            {isMobile && minimalComingSoonHomeNavbar && storeEnabled ? (
              <Button
                component="a"
                href={storeHref}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  flexShrink: 0,
                  ml: 0.75,
                  color: 'rgba(255,255,255,0.96)',
                  textTransform: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  minHeight: 40,
                  minWidth: 44,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  bgcolor: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(156,187,217,0.22)',
                  textDecoration: 'none',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  boxSizing: 'border-box',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    borderColor: 'rgba(156,187,217,0.32)',
                  },
                }}
              >
                Store
              </Button>
            ) : null}
            {/* Search: recessed bar, placeholder "I'm looking for..." — only when logged in; hidden on /join (public header) */}
            {!isMobile &&
              !isCompactDesktop &&
              !forcePublicHeader &&
              showAuthedHeader && (
                <Box
                  ref={setSearchAnchorEl}
                  sx={{ position: 'relative', minWidth: 240 }}
                >
                  <Box
                    component="form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const query = searchQuery.trim();
                      closeSearchDropdown();
                      navigate(
                        query
                          ? `/directory?q=${encodeURIComponent(query)}`
                          : '/directory',
                      );
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 40,
                      minWidth: 220,
                      maxWidth: 320,
                      bgcolor: 'rgba(56,132,210,0.14)',
                      borderRadius: '999px',
                      border: '1px solid rgba(156,187,217,0.18)',
                      transition: 'border-color 0.2s, background-color 0.2s',
                      '&:focus-within': {
                        bgcolor: 'rgba(156,187,217,0.18)',
                        borderColor: 'rgba(141,188,229,0.34)',
                      },
                    }}
                  >
                    <SearchIcon
                      sx={{
                        ml: 1.5,
                        mr: 1,
                        fontSize: 22,
                        color: 'rgba(255,255,255,0.5)',
                      }}
                      aria-hidden
                    />
                    <InputBase
                      placeholder="I'm looking for..."
                      value={searchQuery}
                      onChange={(e) =>
                        setSearchQuery(
                          e.target.value.slice(0, SEARCH_MAX_QUERY_CHARS),
                        )
                      }
                      onFocus={() =>
                        searchQuery.trim().length >= SEARCH_MIN_LENGTH &&
                        setSearchOpen(true)
                      }
                      inputProps={{
                        'aria-label': 'Search for members',
                        'aria-expanded': searchOpen,
                        maxLength: SEARCH_MAX_QUERY_CHARS,
                      }}
                      fullWidth
                      sx={{
                        color: 'white',
                        fontSize: '1rem',
                        '& .MuiInputBase-input': {
                          py: 1,
                          px: 0,
                          '&::placeholder': {
                            color: 'rgba(255,255,255,0.5)',
                            opacity: 1,
                          },
                        },
                      }}
                    />
                  </Box>
                  <Popper
                    open={
                      searchOpen &&
                      (searchMatches.length > 0 ||
                        searchLoading ||
                        (searchQuery.trim().length >= SEARCH_MIN_LENGTH &&
                          !searchLoading))
                    }
                    anchorEl={searchAnchorEl}
                    placement="bottom-start"
                    sx={{ zIndex: 1300 }}
                    modifiers={[
                      { name: 'offset', options: { offset: [0, 4] } },
                    ]}
                  >
                    <Paper
                      ref={searchPopperRef}
                      elevation={8}
                      sx={{
                        minWidth: searchAnchorEl?.offsetWidth ?? 280,
                        maxWidth: 360,
                        maxHeight: 320,
                        overflow: 'auto',
                        ...denseMenuPaperSxFromTheme(theme),
                      }}
                    >
                      {searchLoading ? (
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            py: 2,
                          }}
                        >
                          <CircularProgress
                            size={24}
                            sx={{
                              color: isLightNav ? 'primary.main' : 'white',
                            }}
                            aria-label="Loading search"
                          />
                        </Box>
                      ) : searchMatches.length === 0 ? (
                        <Box sx={{ px: 2, py: 2 }}>
                          <Box
                            sx={{
                              color: 'text.secondary',
                              fontSize: '1rem',
                              mb: 1,
                            }}
                          >
                            No matches for &quot;{searchQuery.trim()}&quot;
                          </Box>
                          <Button
                            component={RouterLink}
                            to={`/directory?q=${encodeURIComponent(searchQuery.trim())}`}
                            size="small"
                            onClick={closeSearchDropdown}
                            sx={{
                              color: 'primary.light',
                              textTransform: 'none',
                            }}
                          >
                            View all in Directory
                          </Button>
                        </Box>
                      ) : (
                        <Stack
                          component="ul"
                          sx={{ listStyle: 'none', m: 0, p: 0.5 }}
                        >
                          {searchMatches.map((p) => {
                            const handle = p.handle || p.id;
                            const label = p.display_name || p.handle || handle;
                            return (
                              <MenuItem
                                key={p.id}
                                component={RouterLink}
                                to={`/profile/${handle}`}
                                onClick={() => {
                                  setSearchQuery('');
                                  closeSearchDropdown();
                                }}
                                sx={{
                                  color: 'text.primary',
                                  '&:hover': {
                                    bgcolor: 'action.hover',
                                  },
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  <PersonIcon
                                    sx={{
                                      color: 'text.secondary',
                                      fontSize: 20,
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={label}
                                  secondary={
                                    p.handle && p.handle !== label
                                      ? `@${p.handle}`
                                      : null
                                  }
                                  primaryTypographyProps={{ fontWeight: 600 }}
                                  secondaryTypographyProps={{
                                    variant: 'caption',
                                  }}
                                />
                              </MenuItem>
                            );
                          })}
                        </Stack>
                      )}
                    </Paper>
                  </Popper>
                </Box>
              )}
          </Stack>

          {/* Desktop nav links: Dashboard, Directory, Events, Feed, Store (Admin is in avatar menu) */}
          {!isMobile && (
            <Box component="span" sx={{ display: 'contents' }}>
              {showAuthedHeader && (
                <>
                  {dashboardEnabled && (
                    <Button
                      component={RouterLink}
                      to="/dashboard"
                      sx={{
                        color: 'rgba(255,255,255,0.85)',
                        textTransform: 'none',
                        fontSize: isCompactDesktop ? '0.92rem' : '1rem',
                        px: isCompactDesktop ? 1 : 1.5,
                        ...(isDashboardActive && {
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                        }),
                      }}
                    >
                      Dashboard
                    </Button>
                  )}
                  {directoryEnabled && (
                    <Button
                      component={RouterLink}
                      to="/directory"
                      sx={{
                        color: 'rgba(255,255,255,0.85)',
                        textTransform: 'none',
                        fontSize: isCompactDesktop ? '0.92rem' : '1rem',
                        px: isCompactDesktop ? 1 : 1.5,
                        ...(isDirectoryActive && {
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                        }),
                      }}
                    >
                      Directory
                    </Button>
                  )}
                  {eventsEnabled && (
                    <Button
                      component={RouterLink}
                      to="/events"
                      sx={{
                        color: 'rgba(255,255,255,0.85)',
                        textTransform: 'none',
                        fontSize: isCompactDesktop ? '0.92rem' : '1rem',
                        px: isCompactDesktop ? 1 : 1.5,
                        ...(isEventsActive && {
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                        }),
                      }}
                    >
                      Events
                    </Button>
                  )}
                  {feedEnabled && (
                    <Button
                      component={RouterLink}
                      to="/feed"
                      sx={{
                        color: 'rgba(255,255,255,0.85)',
                        textTransform: 'none',
                        fontSize: isCompactDesktop ? '0.92rem' : '1rem',
                        px: isCompactDesktop ? 1 : 1.5,
                        ...(isFeedActive && {
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                        }),
                      }}
                    >
                      Feed
                    </Button>
                  )}
                </>
              )}
              {storeEnabled && (
                <Button
                  component="a"
                  href={storeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    textDecoration: 'none',
                    textTransform: 'none',
                    fontSize: isCompactDesktop ? '0.92rem' : '1rem',
                    px: isCompactDesktop ? 1 : 1.5,
                  }}
                >
                  Store
                </Button>
              )}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop auth: hidden on mobile (shown in drawer); hidden on coming-soon home (no stuck spinner). */}
          {!isMobile && !minimalComingSoonHomeNavbar && (
            <Stack direction="row" spacing={2} alignItems="center">
              {path === '/auth/callback' ? null : !sessionLoaded ||
                (session && !onboardingLoaded) ? ( // Avoid conflicting spinner while AuthCallback handles OAuth
                <CircularProgress
                  size={16}
                  sx={{ color: 'text.secondary' }}
                  aria-label="Loading"
                />
              ) : !session && (!productionComingSoon || isAdminActive) ? (
                <>
                  {/* Guest: Join + Sign in — only when signed out (never show if session exists) */}
                  {!isJoinActive && (
                    <Button
                      component="button"
                      type="button"
                      onClick={() => void openJoin()}
                      sx={{
                        color: 'rgba(255,255,255,0.96)',
                        textTransform: 'none',
                        fontSize: '1rem',
                        minWidth: 0,
                        px: 1,
                        '&:hover': {
                          bgcolor: 'rgba(56,132,210,0.14)',
                          color: 'white',
                        },
                      }}
                    >
                      Join
                    </Button>
                  )}
                  <Button
                    component="button"
                    type="button"
                    onClick={() => void openSignIn()}
                    sx={{
                      color: 'rgba(255,255,255,0.96)',
                      textTransform: 'none',
                      fontSize: '1rem',
                      minWidth: 0,
                      px: 1,
                      '&:hover': {
                        bgcolor: 'rgba(56,132,210,0.14)',
                        color: 'white',
                      },
                    }}
                  >
                    Sign in
                  </Button>
                </>
              ) : (
                <>
                  {showAuthedHeader && dashboardEnabled && (
                    <Tooltip
                      title={
                        notificationsUnread > 0
                          ? `${notificationsUnread} unread notifications`
                          : 'Notifications'
                      }
                    >
                      <IconButton
                        component={RouterLink}
                        to="/dashboard/notifications"
                        aria-label={
                          notificationsUnread > 0
                            ? `${notificationsUnread} unread notifications`
                            : 'Notifications'
                        }
                        sx={{
                          color: 'rgba(255,255,255,0.85)',
                          ...(path === '/dashboard/notifications' && {
                            color: 'white',
                            bgcolor: 'rgba(156,187,217,0.26)',
                            '&:hover': { bgcolor: 'rgba(141,188,229,0.34)' },
                          }),
                        }}
                      >
                        <Badge
                          badgeContent={
                            notificationsUnread > 0
                              ? notificationsUnread
                              : undefined
                          }
                          color="error"
                        >
                          <NotificationsIcon sx={{ fontSize: 22 }} />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                  )}
                  {/* Hide avatar completely in coming soon mode unless on admin route */}
                  {(!productionComingSoon || isAdminActive) && (
                    <>
                      <Tooltip title="Account menu" disableInteractive>
                        <IconButton
                          type="button"
                          onClick={(e) => setAvatarMenuAnchor(e.currentTarget)}
                          aria-label="Account menu"
                          aria-haspopup="true"
                          aria-expanded={Boolean(avatarMenuAnchor)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                            p: 0.25,
                            color: 'inherit',
                            borderRadius: 9999,
                            '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.4)',
                              p: '1px',
                              flexShrink: 0,
                            }}
                          >
                            <ProfileAvatar
                              src={avatarUrl ?? undefined}
                              alt={
                                session?.user?.user_metadata?.full_name ||
                                'User'
                              }
                              size="small"
                              sx={{ width: 24, height: 24 }}
                            />
                          </Box>
                          <KeyboardArrowDownIcon
                            sx={{
                              fontSize: 16,
                              color: 'rgba(255,255,255,0.8)',
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </>
              )}
            </Stack>
          )}

          {/* Mobile: Join/Sign in — real links + touch-action so iOS doesn't eat taps */}
          {isMobile && !minimalComingSoonHomeNavbar && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{
                flexShrink: 0,
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'auto',
                touchAction: 'manipulation',
              }}
            >
              {path === '/auth/callback' ? null : !sessionLoaded ||
                (session && !onboardingLoaded) ? (
                <CircularProgress
                  size={16}
                  sx={{ color: 'text.secondary' }}
                  aria-label="Loading"
                />
              ) : !session && (!productionComingSoon || isAdminActive) ? (
                <>
                  {!isJoinActive && (
                    <Button
                      component={RouterLink}
                      to="/join"
                      onClick={() => setDrawerOpen(false)}
                      aria-label="Join"
                      size="small"
                      sx={{
                        minHeight: 40,
                        minWidth: 'auto',
                        px: 1.25,
                        color: 'rgba(255,255,255,0.96)',
                        textTransform: 'none',
                        fontSize: '0.9375rem',
                        touchAction: 'manipulation',
                        pointerEvents: 'auto',
                        '&:hover': {
                          color: 'white',
                          bgcolor: 'rgba(56,132,210,0.14)',
                        },
                      }}
                    >
                      Join
                    </Button>
                  )}
                  <Button
                    component={RouterLink}
                    to="/join"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Sign in"
                    size="small"
                    sx={{
                      minHeight: 40,
                      minWidth: 'auto',
                      px: 1.25,
                      color: 'rgba(255,255,255,0.96)',
                      textTransform: 'none',
                      fontSize: '0.9375rem',
                      touchAction: 'manipulation',
                      pointerEvents: 'auto',
                      '&:hover': {
                        color: 'white',
                        bgcolor: 'rgba(56,132,210,0.14)',
                      },
                    }}
                  >
                    Sign in
                  </Button>
                </>
              ) : (
                <>
                  {/* Match desktop: hide notifications + avatar in coming soon unless /admin */}
                  {(!productionComingSoon || isAdminActive) && (
                    <>
                      {showAuthedHeader && dashboardEnabled && (
                        <Tooltip
                          title={
                            notificationsUnread > 0
                              ? `${notificationsUnread} unread notifications`
                              : 'Notifications'
                          }
                        >
                          <IconButton
                            component={RouterLink}
                            to="/dashboard/notifications"
                            aria-label={
                              notificationsUnread > 0
                                ? `${notificationsUnread} unread notifications`
                                : 'Notifications'
                            }
                            sx={{
                              color: 'white',
                              ...(path === '/dashboard/notifications' && {
                                bgcolor: 'rgba(156,187,217,0.26)',
                                '&:hover': {
                                  bgcolor: 'rgba(141,188,229,0.34)',
                                },
                              }),
                            }}
                          >
                            <Badge
                              badgeContent={
                                notificationsUnread > 0
                                  ? notificationsUnread
                                  : undefined
                              }
                              color="error"
                            >
                              <NotificationsIcon sx={{ fontSize: 22 }} />
                            </Badge>
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Account menu" disableInteractive>
                        <IconButton
                          type="button"
                          onClick={(e) => setAvatarMenuAnchor(e.currentTarget)}
                          aria-label="Account menu"
                          aria-haspopup="true"
                          aria-expanded={Boolean(avatarMenuAnchor)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                            p: 0.25,
                            color: 'inherit',
                            borderRadius: 9999,
                            '&:hover': { bgcolor: 'rgba(56,132,210,0.14)' },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.4)',
                              p: '1px',
                              flexShrink: 0,
                            }}
                          >
                            <ProfileAvatar
                              src={avatarUrl ?? undefined}
                              alt={
                                session?.user?.user_metadata?.full_name ||
                                'User'
                              }
                              size="small"
                              sx={{ width: 24, height: 24 }}
                            />
                          </Box>
                          <KeyboardArrowDownIcon
                            sx={{
                              fontSize: 16,
                              color: 'rgba(255,255,255,0.8)',
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </>
              )}
            </Stack>
          )}
        </Toolbar>
        {showHeaderAccountDropdown ? (
          <Menu
            anchorEl={avatarMenuAnchor}
            open={Boolean(avatarMenuAnchor)}
            onClose={() => setAvatarMenuAnchor(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: (t) => ({
                  mt: 1.5,
                  minWidth: 180,
                  borderRadius: 2,
                  bgcolor: t.palette.background.paper,
                  border: `1px solid ${t.palette.divider}`,
                  color: t.palette.text.primary,
                }),
              },
            }}
          >
            {dashboardEnabled && (
              <MenuItem
                component={RouterLink}
                to="/dashboard"
                onClick={() => {
                  setAvatarMenuAnchor(null);
                  setDrawerOpen(false);
                }}
                sx={{ py: 1.25 }}
              >
                Profile
              </MenuItem>
            )}
            {dashboardEnabled && (
              <MenuItem
                component={RouterLink}
                to="/dashboard/settings"
                onClick={() => {
                  setAvatarMenuAnchor(null);
                  setDrawerOpen(false);
                }}
                sx={{ py: 1.25 }}
              >
                Account & settings
              </MenuItem>
            )}
            {isAdmin && (
              <MenuItem
                component={RouterLink}
                to="/admin"
                onClick={() => {
                  setAvatarMenuAnchor(null);
                  setDrawerOpen(false);
                }}
                sx={{ py: 1.25, color: 'warning.main' }}
              >
                Admin
              </MenuItem>
            )}
            {dashboardEnabled && <Divider sx={{ my: 0.5 }} />}
            <MenuItem
              onClick={() => {
                setAvatarMenuAnchor(null);
                setDrawerOpen(false);
                void handleSignOut();
              }}
              disabled={busy}
              sx={{ color: 'text.secondary', py: 1.25 }}
            >
              Sign Out
            </MenuItem>
          </Menu>
        ) : null}
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: drawerPaperSx,
        }}
      >
        <Box sx={{ py: 2, overflow: 'auto' }}>
          <Stack component="nav" spacing={0} sx={{ px: 1 }}>
            {!session && (
              <>
                {(!productionComingSoon || isAdminActive) && (
                  <>
                    {!isJoinActive && (
                      <Button
                        component={RouterLink}
                        to="/join"
                        onClick={() => setDrawerOpen(false)}
                        sx={{
                          justifyContent: 'flex-start',
                          color: drawerLinkColor,
                          textTransform: 'none',
                          py: 1.5,
                          minHeight: 44,
                          touchAction: 'manipulation',
                        }}
                      >
                        Join
                      </Button>
                    )}
                    <Button
                      component={RouterLink}
                      to="/join"
                      onClick={() => setDrawerOpen(false)}
                      sx={{
                        justifyContent: 'flex-start',
                        color: drawerLinkColor,
                        textTransform: 'none',
                        py: 1.5,
                        minHeight: 44,
                        touchAction: 'manipulation',
                      }}
                    >
                      Sign in
                    </Button>
                  </>
                )}
                {storeEnabled && (
                  <Button
                    component="a"
                    href={storeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: drawerLinkColor,
                      textTransform: 'none',
                      py: 1.5,
                    }}
                  >
                    Store
                  </Button>
                )}
              </>
            )}
            {showAuthedHeader && (
              <>
                {dashboardEnabled && (
                  <Button
                    component={RouterLink}
                    to="/dashboard"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: drawerLinkColor,
                      textTransform: 'none',
                      py: 1.5,
                      ...(isDashboardActive ? drawerActiveNavSx : {}),
                    }}
                  >
                    Dashboard
                  </Button>
                )}
                {directoryEnabled && (
                  <Button
                    component={RouterLink}
                    to="/directory"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: drawerLinkColor,
                      textTransform: 'none',
                      py: 1.5,
                      ...(isDirectoryActive ? drawerActiveNavSx : {}),
                    }}
                  >
                    Directory
                  </Button>
                )}
                {eventsEnabled && (
                  <Button
                    component={RouterLink}
                    to="/events"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: drawerLinkColor,
                      textTransform: 'none',
                      py: 1.5,
                      ...(isEventsActive ? drawerActiveNavSx : {}),
                    }}
                  >
                    Events
                  </Button>
                )}
                {feedEnabled && (
                  <Button
                    component={RouterLink}
                    to="/feed"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: drawerLinkColor,
                      textTransform: 'none',
                      py: 1.5,
                      ...(isFeedActive ? drawerActiveNavSx : {}),
                    }}
                  >
                    Feed
                  </Button>
                )}
                {storeEnabled && (
                  <Button
                    component="a"
                    href={storeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: drawerLinkColor,
                      textTransform: 'none',
                      py: 1.5,
                    }}
                  >
                    Store
                  </Button>
                )}
                {chatUiForMember(chatEnabled, session?.user?.id) ? (
                  <Button
                    component={RouterLink}
                    to="/chat-full"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: drawerLinkColor,
                      textTransform: 'none',
                      py: 1.5,
                      ...(path === '/chat-full' ||
                      path.startsWith('/chat-full/')
                        ? drawerActiveNavSx
                        : {}),
                    }}
                  >
                    Chat
                  </Button>
                ) : null}
              </>
            )}
          </Stack>

          {/* Explore: sub-menus (matches Feed sidebar) */}
          {showAuthedHeader && (
            <List dense disablePadding sx={{ py: 0 }}>
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: 1,
                  pt: 2,
                  pb: 0.5,
                  px: 2,
                }}
              >
                Explore
              </ListSubheader>
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  py: 0.5,
                  px: 2,
                }}
              >
                Community
              </ListSubheader>
              {eventsEnabled && (
                <ListItemButton
                  component={RouterLink}
                  to="/events"
                  onClick={() => setDrawerOpen(false)}
                  sx={{ minHeight: 40, py: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <EventIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Events"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItemButton>
              )}
              {groupsEnabled && (
                <ListItemButton
                  component={RouterLink}
                  to="/groups"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    minHeight: 40,
                    py: 0.5,
                    ...(isGroupsActive ? drawerActiveNavSx : {}),
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ForumIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Groups"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItemButton>
              )}
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  py: 0.5,
                  px: 2,
                  pt: 1.5,
                }}
              >
                Your stuff
              </ListSubheader>
              <ListItemButton
                component={RouterLink}
                to="/saved"
                onClick={() => setDrawerOpen(false)}
                sx={{ minHeight: 40, py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <BookmarkBorderIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Saved"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  py: 0.5,
                  px: 2,
                  pt: 1.5,
                }}
              >
                Platform
              </ListSubheader>
              <ListItemButton
                component={RouterLink}
                to="/advertise"
                state={{ backgroundLocation: location }}
                onClick={() => setDrawerOpen(false)}
                sx={{ minHeight: 40, py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CampaignIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Advertise"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
              {gamesEnabled && (
                <>
                  <ListSubheader
                    component="div"
                    sx={{
                      bgcolor: 'transparent',
                      color: 'text.secondary',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      py: 0.5,
                      px: 2,
                      pt: 1.5,
                    }}
                  >
                    Games
                  </ListSubheader>
                  <ListItemButton
                    component={RouterLink}
                    to="/dashboard/games"
                    onClick={() => setDrawerOpen(false)}
                    sx={{ minHeight: 40, py: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <SportsEsportsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="All games"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItemButton>
                  {[
                    { to: '/dashboard/games', label: 'Phuzzle' },
                    { to: '/dashboard/games/hangman', label: 'Hangman' },
                    { to: '/dashboard/games/snake', label: 'Snake' },
                    { to: '/dashboard/games/slots', label: 'Slots' },
                    { to: '/dashboard/games', label: 'Tic-Tac-Toe' },
                    { to: '/dashboard/games', label: 'Connect 4' },
                    { to: '/dashboard/games', label: 'Checkers' },
                  ].map(({ to, label }) => (
                    <ListItemButton
                      key={label}
                      component={RouterLink}
                      to={to}
                      onClick={() => setDrawerOpen(false)}
                      sx={{ minHeight: 36, py: 0.5, pl: 4 }}
                    >
                      <ListItemText
                        primary={label}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  ))}
                </>
              )}
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  py: 0.5,
                  px: 2,
                  pt: 1.5,
                }}
              >
                Support
              </ListSubheader>
              <ListItemButton
                component={RouterLink}
                to="/help"
                onClick={() => setDrawerOpen(false)}
                sx={{ minHeight: 40, py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <HelpOutlineIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Help"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
            </List>
          )}

          {/* Legal (always visible in drawer for all users) */}
          <List dense disablePadding sx={{ py: 0 }}>
            <ListSubheader
              component="div"
              sx={{
                bgcolor: 'transparent',
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.7rem',
                py: 0.5,
                px: 2,
                pt: 2,
                pb: 0.5,
              }}
            >
              Legal
            </ListSubheader>
            <ListItemButton
              component={RouterLink}
              to="/terms"
              onClick={() => setDrawerOpen(false)}
              sx={{ minHeight: 40, py: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GavelIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Terms of Service"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
            <ListItemButton
              component={RouterLink}
              to="/privacy"
              onClick={() => setDrawerOpen(false)}
              sx={{ minHeight: 40, py: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GavelIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Privacy Policy"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
            <ListItemButton
              component={RouterLink}
              to="/guidelines"
              onClick={() => setDrawerOpen(false)}
              sx={{ minHeight: 40, py: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GavelIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Community Guidelines"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
      <Backdrop
        open={joinLoading}
        sx={{
          color: '#FFFFFF',
          zIndex: (theme) => theme.zIndex.drawer + 2,
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        <CircularProgress color="inherit" size={28} aria-label="Opening Join" />
        <Box sx={{ fontSize: 14, opacity: 0.9 }}>Opening Join…</Box>
      </Backdrop>
    </>
  );
};

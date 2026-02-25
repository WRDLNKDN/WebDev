import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CampaignIcon from '@mui/icons-material/Campaign';
import EventIcon from '@mui/icons-material/Event';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ForumIcon from '@mui/icons-material/Forum';
import GavelIcon from '@mui/icons-material/Gavel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
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
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  MenuItem,
  Paper,
  Popper,
  Snackbar,
  Stack,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { ProfileAvatar } from '../avatar/ProfileAvatar';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useNotificationsUnread } from '../../hooks/useNotificationsUnread';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { consumeJoinCompletionFlash } from '../../lib/profile/joinCompletionFlash';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';

/**
 * Store link: IF VITE_STORE_URL is set in .env, use it; ELSE use fallback
 * (https://wrdlnkdn.com/store-1). Store always opens in a new tab.
 */
const storeUrl =
  (import.meta.env.VITE_STORE_URL as string | undefined) ||
  'https://wrdlnkdn.com/store-1';

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
  const forcePublicHeader = path === '/join';
  const isFeedActive = path === '/feed';
  const isJoinActive = path === '/join';
  const isDirectoryActive =
    path === '/directory' || path.startsWith('/directory');
  const isDashboardActive =
    path === '/dashboard' || path.startsWith('/dashboard/');

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
  const [snack, setSnack] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { avatarUrl } = useCurrentUserAvatar();
  const notificationsUnread = useNotificationsUnread();
  const isEventsActive = path === '/events' || path.startsWith('/events/');
  const isGroupsActive = path === '/groups' || path.startsWith('/groups/');
  const showAuthedHeader =
    Boolean(session) && profileOnboarded && !forcePublicHeader;
  const showUnreadNotifications = showAuthedHeader && notificationsUnread > 0;

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
    const timers = retries.map((delay) =>
      setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          setSession(data.session);
          setSessionLoaded(true);
        }
      }, delay),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
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
    return () => {
      cancelled = true;
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

  const signOut = async () => {
    setBusy(true);

    try {
      // Navigate away from protected routes first so RequireOnboarded
      // doesn't redirect to /join when it sees SIGNED_OUT
      navigate('/');
      setSession(null);

      await supabase.auth.signOut();
      // Clear all env-prefixed auth keys (uat-, prod-, dev-)
      [
        'uat-sb-wrdlnkdn-auth',
        'prod-sb-wrdlnkdn-auth',
        'dev-sb-wrdlnkdn-auth',
      ].forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      console.error(error);
      setSnack(toMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openJoin = useCallback(async () => {
    if (path === '/join') {
      setJoinLoading(false);
      return;
    }
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

  useEffect(() => {
    if (path === '/join') {
      setJoinLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (path !== '/feed') return;
    if (!consumeJoinCompletionFlash()) return;
    setSnack('Join complete. Welcome to the Feed.');
  }, [path]);

  return (
    <>
      <AppBar
        component="nav"
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: 'rgba(18, 18, 18, 0.9)', // Deep glass effect
          backdropFilter: 'blur(12px)',
          zIndex: 1100,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Toolbar sx={{ py: 0.5, px: { xs: 1, sm: 2 } }}>
          {/* Mobile: hamburger menu */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Brand: single static logo (wrdlnkdn_logo.png); no cycling Weirdlings */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              mr: isMobile ? 1 : 3,
              height: '64px',
            }}
          >
            <Box
              component="img"
              src="/assets/wrdlnkdn_logo.png"
              alt="WRDLNKDN"
              sx={{
                height: { xs: 26, md: 32 },
                width: 'auto',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.8 },
              }}
            />
          </Box>

          {/* Desktop nav links: hidden on mobile (shown in drawer) */}
          {!isMobile && (
            <Box component="span" sx={{ display: 'contents' }}>
              {/* Store: external link (storeUrl from env or fallback) */}
              <Button
                component="a"
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'white', textDecoration: 'none' }}
              >
                Store
              </Button>
              {/* IF logged in: show Feed + Dashboard + Search; ELSE these are hidden */}
              {showAuthedHeader && (
                <>
                  <Button
                    component={RouterLink}
                    to="/feed"
                    sx={{
                      color: 'white',
                      ...(isFeedActive && {
                        bgcolor: 'rgba(255,255,255,0.12)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                      }),
                    }}
                  >
                    Feed
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/directory"
                    sx={{
                      color: 'white',
                      ...(isDirectoryActive && {
                        bgcolor: 'rgba(255,255,255,0.12)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                      }),
                    }}
                  >
                    Directory
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/events"
                    sx={{
                      color: 'white',
                      ...(isEventsActive && {
                        bgcolor: 'rgba(255,255,255,0.12)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                      }),
                    }}
                  >
                    Events
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/dashboard"
                    sx={{
                      color: 'white',
                      ...(isDashboardActive && {
                        bgcolor: 'rgba(255,255,255,0.12)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                      }),
                    }}
                  >
                    Dashboard
                  </Button>
                  <Box ref={setSearchAnchorEl} sx={{ position: 'relative' }}>
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
                        ml: 2,
                        height: 36,
                        minWidth: 200,
                        maxWidth: 280,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        borderRadius: 1,
                        border: '1px solid rgba(255,255,255,0.1)',
                        transition: 'border-color 0.2s, background-color 0.2s',
                        '&:focus-within': {
                          bgcolor: 'rgba(255,255,255,0.08)',
                          borderColor: 'rgba(255,255,255,0.2)',
                        },
                      }}
                    >
                      <SearchIcon
                        sx={{
                          ml: 1.5,
                          mr: 0.5,
                          fontSize: 20,
                          color: 'rgba(255,255,255,0.5)',
                        }}
                        aria-hidden
                      />
                      <InputBase
                        placeholder="Search for members"
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
                          fontSize: '0.875rem',
                          '& .MuiInputBase-input': {
                            py: 0.875,
                            px: 0.5,
                            '&::placeholder': {
                              color: 'rgba(255,255,255,0.5)',
                              opacity: 1,
                            },
                          },
                        }}
                      />
                      <Button
                        type="submit"
                        size="small"
                        sx={{
                          color: 'rgba(255,255,255,0.8)',
                          textTransform: 'none',
                          mr: 0.5,
                          minWidth: 56,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                        }}
                      >
                        Search
                      </Button>
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
                          bgcolor: 'rgba(30,30,30,0.98)',
                          border: '1px solid rgba(255,255,255,0.12)',
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
                              sx={{ color: 'white' }}
                            />
                          </Box>
                        ) : searchMatches.length === 0 ? (
                          <Box sx={{ px: 2, py: 2 }}>
                            <Box
                              sx={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '0.875rem',
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
                              const label =
                                p.display_name || p.handle || handle;
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
                                    color: 'white',
                                    '&:hover': {
                                      bgcolor: 'rgba(255,255,255,0.08)',
                                    },
                                  }}
                                >
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <PersonIcon
                                      sx={{
                                        color: 'rgba(255,255,255,0.6)',
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
                </>
              )}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop auth: hidden on mobile (shown in drawer) */}
          {!isMobile && (
            <Stack direction="row" spacing={2} alignItems="center">
              {path === '/auth/callback' ? null : !sessionLoaded ||
                (session && !onboardingLoaded) ? ( // Avoid conflicting spinner while AuthCallback handles OAuth
                <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
              ) : !showAuthedHeader ? (
                <>
                  {/* Guest: Join + Sign in (both route to /join) */}
                  {!isJoinActive && (
                    <Box
                      component="button"
                      type="button"
                      onClick={() => void openJoin()}
                      sx={{
                        background: 'none',
                        border: 0,
                        p: 0,
                        font: 'inherit',
                        cursor: 'pointer',
                        color: 'text.secondary',
                        textDecoration: 'none',
                        '&:hover': { color: 'white' },
                      }}
                    >
                      Join
                    </Box>
                  )}
                  <Box
                    component="button"
                    type="button"
                    onClick={() => void openJoin()}
                    sx={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'text.secondary',
                      font: 'inherit',
                      '&:hover': { color: 'white' },
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    Sign in
                  </Box>
                </>
              ) : (
                <>
                  {showUnreadNotifications && (
                    <IconButton
                      component={RouterLink}
                      to="/dashboard/notifications"
                      aria-label={`${notificationsUnread} unread notifications`}
                      sx={{
                        color: 'white',
                        ...(path === '/dashboard/notifications' && {
                          bgcolor: 'rgba(255,255,255,0.12)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                        }),
                      }}
                    >
                      <Badge badgeContent={notificationsUnread} color="error">
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  )}
                  <Box
                    component={RouterLink}
                    to="/dashboard"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <ProfileAvatar
                      src={avatarUrl ?? undefined}
                      alt={session?.user?.user_metadata?.full_name || 'User'}
                      size="small"
                    />
                  </Box>
                  {isAdmin && (
                    <Button
                      component={RouterLink}
                      to="/admin"
                      sx={{ color: 'warning.main' }}
                    >
                      Admin
                    </Button>
                  )}

                  <Button
                    sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                    onClick={() => void signOut()}
                    disabled={busy}
                  >
                    Sign Out
                  </Button>
                </>
              )}
            </Stack>
          )}

          {/* Mobile: Join/Sign in always visible in navbar (or minimal auth) */}
          {isMobile && (
            <Stack direction="row" spacing={1} alignItems="center">
              {path === '/auth/callback' ? null : !sessionLoaded ||
                (session && !onboardingLoaded) ? (
                <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
              ) : !showAuthedHeader ? (
                <>
                  {!isJoinActive && (
                    <Box
                      component="button"
                      type="button"
                      onClick={() => void openJoin()}
                      sx={{
                        background: 'none',
                        border: 0,
                        p: 0,
                        font: 'inherit',
                        cursor: 'pointer',
                        color: 'text.secondary',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        '&:hover': { color: 'white' },
                      }}
                    >
                      Join
                    </Box>
                  )}
                  <Box
                    component="button"
                    type="button"
                    onClick={() => void openJoin()}
                    sx={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'text.secondary',
                      font: 'inherit',
                      fontSize: '0.875rem',
                      '&:hover': { color: 'white' },
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    Sign in
                  </Box>
                </>
              ) : (
                <>
                  {showUnreadNotifications && (
                    <IconButton
                      component={RouterLink}
                      to="/dashboard/notifications"
                      aria-label={`${notificationsUnread} unread notifications`}
                      sx={{
                        color: 'white',
                        ...(path === '/dashboard/notifications' && {
                          bgcolor: 'rgba(255,255,255,0.12)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                        }),
                      }}
                    >
                      <Badge badgeContent={notificationsUnread} color="error">
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  )}
                  <Box
                    component={RouterLink}
                    to="/dashboard"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <ProfileAvatar
                      src={avatarUrl ?? undefined}
                      alt={session?.user?.user_metadata?.full_name || 'User'}
                      size="small"
                    />
                  </Box>
                  <Button
                    size="small"
                    sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                    onClick={() => void signOut()}
                    disabled={busy}
                  >
                    Sign Out
                  </Button>
                </>
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'rgba(18, 18, 18, 0.98)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box sx={{ py: 2, overflow: 'auto' }}>
          <Stack component="nav" spacing={0} sx={{ px: 1 }}>
            <Button
              component="a"
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDrawerOpen(false)}
              sx={{
                justifyContent: 'flex-start',
                color: 'white',
                textTransform: 'none',
                py: 1.5,
              }}
            >
              Store
            </Button>
            {showAuthedHeader && (
              <>
                <Button
                  component={RouterLink}
                  to="/feed"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    ...(isFeedActive && {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                    }),
                  }}
                >
                  Feed
                </Button>
                <Button
                  component={RouterLink}
                  to="/dashboard"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    ...(isDashboardActive && {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                    }),
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  component={RouterLink}
                  to="/directory"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'white',
                    textTransform: 'none',
                    py: 1.5,
                    ...(isDirectoryActive && {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                    }),
                  }}
                >
                  Directory
                </Button>
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
              <ListItemButton
                component={RouterLink}
                to="/groups"
                onClick={() => setDrawerOpen(false)}
                sx={{
                  minHeight: 40,
                  py: 0.5,
                  ...(isGroupsActive && {
                    bgcolor: 'rgba(255,255,255,0.12)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                  }),
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
              <ListItemButton
                component="a"
                href="https://phuzzle.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDrawerOpen(false)}
                sx={{ minHeight: 40, py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <SportsEsportsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Games"
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

          {showAuthedHeader && (
            <Box sx={{ pt: 2, px: 2 }}>
              {isAdmin && (
                <Button
                  component={RouterLink}
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'warning.main',
                    textTransform: 'none',
                    py: 1,
                    px: 1,
                  }}
                >
                  Admin
                </Button>
              )}
              <Button
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.secondary',
                  textTransform: 'none',
                  py: 1,
                  px: 1,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => {
                  setDrawerOpen(false);
                  void signOut();
                }}
                disabled={busy}
              >
                Sign Out
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Backdrop
        open={joinLoading}
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 2,
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        <CircularProgress color="inherit" size={28} />
        <Box sx={{ fontSize: 14, opacity: 0.9 }}>Opening Join…</Box>
      </Backdrop>
    </>
  );
};

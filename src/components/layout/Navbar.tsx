/**
 * Navbar — canonical global navigation for WRDLNKDN.
 *
 * Governance:
 * - All auth state via useNavbarAuth hook (no inline session logic).
 * - All nav items via NavbarDesktopNavLinks / NavbarMobileDrawer (driven by navConfig.ts).
 * - All auth controls via NavbarDesktopAuthControls / NavbarMobileAuthControls.
 * - Coming-soon mode collapses to logo-only on home routes.
 * - Feature flags hide items cleanly — no placeholders, no layout shift.
 * - Active state is deterministic: same route = same nav state, always.
 * - z-index: 1250 (above messenger FAB at 1200, below modal at 1300).
 */
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import {
  AppBar,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
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
import PersonIcon from '@mui/icons-material/Person';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useAppToast } from '../../context/AppToastContext';
import { useNotificationsUnread } from '../../hooks/useNotificationsUnread';
import {
  useFeatureFlag,
  usePublicComingSoonMode,
} from '../../context/FeatureFlagsContext';
import {
  DASHBOARD_FLAG,
  GAMES_FLAG,
  GROUPS_FLAG,
  STORE_FLAG,
} from '../../lib/featureFlags/keys';
import { denseMenuPaperSxFromTheme } from '../../lib/ui/formSurface';
import { getNavbarGlass } from '../../theme/candyStyles';
import { NavbarDesktopAuthControls } from './navbar/NavbarDesktopAuthControls';
import { NavbarDesktopNavLinks } from './navbar/NavbarDesktopNavLinks';
import { NavbarMobileAuthControls } from './navbar/NavbarMobileAuthControls';
import { NavbarMobileDrawer } from './navbar/NavbarMobileDrawer';
import { useNavbarAuth } from './navbar/useNavbarAuth';
import { isForcePublicPath, isHomePath } from './navbar/navConfig';
import { supabase } from '../../lib/auth/supabaseClient';

/** Search dropdown result shape. */
type SearchMatch = {
  id: string;
  handle: string | null;
  display_name: string | null;
};

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_MATCHES = 8;
const SEARCH_MAX_QUERY_CHARS = 500;

const KICKSTARTER_URL =
  'https://www.kickstarter.com/projects/wrdlnkdn/wrdlnkdn-business-but-weirder-0';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isCompactDesktop = useMediaQuery(theme.breakpoints.down('lg'));

  // ── Derived path flags ─────────────────────────────────────────────────────
  const forcePublicHeader = isForcePublicPath(path);
  const isAdminActive = path.startsWith('/admin');
  const isJoinActive = path.startsWith('/join');
  const isGroupsActive = path === '/groups' || path.startsWith('/groups/');
  const homeRoute = isHomePath(path);

  // ── Feature flags ──────────────────────────────────────────────────────────
  const comingSoon = usePublicComingSoonMode();
  const dashboardEnabled = useFeatureFlag(DASHBOARD_FLAG);
  const storeEnabled = useFeatureFlag(STORE_FLAG);
  const gamesEnabled = useFeatureFlag(GAMES_FLAG);
  const groupsEnabled = useFeatureFlag(GROUPS_FLAG);

  // ── Auth state ─────────────────────────────────────────────────────────────
  const {
    session,
    sessionLoaded,
    onboardingLoaded,
    profileOnboarded,
    isAdmin,
    busy,
    snack: _snack,
    drawerOpen,
    setDrawerOpen,
    avatarMenuAnchor,
    setAvatarMenuAnchor,
    joinLoading,
    handleSignOut,
    openJoin,
    openSignIn,
  } = useNavbarAuth({ path, forcePublicHeader, navigate });

  const { avatarUrl } = useCurrentUserAvatar();
  const notificationsUnread = useNotificationsUnread();
  const { showToast: _showToast } = useAppToast();

  // ── Derived visibility flags ───────────────────────────────────────────────
  /**
   * Show authenticated nav links and controls.
   * Fail-open while onboarding loads (onboardingLoaded=false) so the icon
   * stays visible during the profile check.
   */
  const showAuthedHeader =
    Boolean(session) &&
    (profileOnboarded || !onboardingLoaded) &&
    !forcePublicHeader &&
    (!comingSoon || isAdminActive);

  /**
   * Coming-soon + home: logo-only chrome.
   * No hamburger, no Join/Sign-in (avoids perpetual mobile spinner on getSession).
   */
  const minimalNavbar = comingSoon && !isAdminActive && homeRoute;

  /** Avatar account dropdown shown when session confirmed and not in minimal mode. */
  const showAccountDropdown =
    Boolean(session) &&
    sessionLoaded &&
    onboardingLoaded &&
    (!comingSoon || isAdminActive) &&
    path !== '/auth/callback' &&
    !minimalNavbar;

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(null);
  const searchPopperRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSearchDropdown = useCallback(() => setSearchOpen(false), []);

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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, display_name')
        .limit(200);
      const list: SearchMatch[] = !error && data ? (data as SearchMatch[]) : [];
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <AppBar
        component="nav"
        position="sticky"
        color="transparent"
        elevation={0}
        sx={(t) => ({
          ...getNavbarGlass(t),
          zIndex: 1250,
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
            ...(isMobile && minimalNavbar && { justifyContent: 'flex-start' }),
          }}
        >
          {/* Mobile hamburger — hidden in minimal coming-soon home chrome */}
          {isMobile && !minimalNavbar && (
            <Tooltip title="Open menu">
              <span>
                <IconButton
                  color="inherit"
                  aria-label="Open menu"
                  onClick={() => setDrawerOpen(true)}
                  sx={{ mr: 0.5 }}
                >
                  <MenuIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* Logo + optional store links */}
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              mr: 0.5,
              minHeight: { xs: 40, sm: 48 },
              gap: isCompactDesktop ? 0.75 : 1.25,
              overflow: 'visible',
              flexShrink: isMobile ? 1 : 0,
              minWidth: 0,
            }}
          >
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

            {storeEnabled && (
              <Stack
                direction="row"
                alignItems="center"
                sx={{ gap: isCompactDesktop ? 0.25 : 0.5 }}
              >
                <Button
                  component="a"
                  href={KICKSTARTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Kickstarter, opens in a new tab"
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    textTransform: 'none',
                    fontSize: isCompactDesktop ? '0.92rem' : '1rem',
                    minWidth: 0,
                    px: isCompactDesktop ? 1 : 1.25,
                    py: 0.625,
                    '&:hover': { bgcolor: 'rgba(56,132,210,0.14)', color: 'white' },
                  }}
                >
                  Kickstarter
                </Button>
              </Stack>
            )}
          </Stack>

          {/* Desktop: authenticated primary nav in IA order */}
          {!isMobile && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                gap: isCompactDesktop ? 0.25 : 0.5,
              }}
            >
              <NavbarDesktopNavLinks
                path={path}
                showAuthedHeader={showAuthedHeader}
                isCompactDesktop={isCompactDesktop}
              />
            </Box>
          )}

          {/* Desktop search — authed only, wide screens only */}
          {!isMobile && !isCompactDesktop && !forcePublicHeader && showAuthedHeader && (
            <Box
              ref={setSearchAnchorEl}
              sx={{ position: 'relative', minWidth: 240, ml: 0.5 }}
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
                  sx={{ ml: 1.5, mr: 1, fontSize: 22, color: 'rgba(255,255,255,0.5)' }}
                  aria-hidden
                />
                <InputBase
                  placeholder="I'm looking for..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(e.target.value.slice(0, SEARCH_MAX_QUERY_CHARS))
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
                    (searchQuery.trim().length >= SEARCH_MIN_LENGTH && !searchLoading))
                }
                anchorEl={searchAnchorEl}
                placement="bottom-start"
                sx={{ zIndex: 1300 }}
                modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress
                        size={24}
                        sx={{ color: 'white' }}
                        aria-label="Loading search"
                      />
                    </Box>
                  ) : searchMatches.length === 0 ? (
                    <Box sx={{ px: 2, py: 2 }}>
                      <Box sx={{ color: 'text.secondary', fontSize: '1rem', mb: 1 }}>
                        No matches for &quot;{searchQuery.trim()}&quot;
                      </Box>
                      <Button
                        component={RouterLink}
                        to={`/directory?q=${encodeURIComponent(searchQuery.trim())}`}
                        size="small"
                        onClick={closeSearchDropdown}
                        sx={{ color: 'primary.light', textTransform: 'none' }}
                      >
                        View all in Directory
                      </Button>
                    </Box>
                  ) : (
                    <Stack component="ul" sx={{ listStyle: 'none', m: 0, p: 0.5 }}>
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
                            sx={{ color: 'text.primary', '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={label}
                              secondary={
                                p.handle && p.handle !== label ? `@${p.handle}` : null
                              }
                              primaryTypographyProps={{ fontWeight: 600 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
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

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop auth controls */}
          {!isMobile && !minimalNavbar && (
            <NavbarDesktopAuthControls
              path={path}
              session={session}
              sessionLoaded={sessionLoaded}
              onboardingLoaded={onboardingLoaded}
              showAuthedHeader={showAuthedHeader}
              comingSoon={comingSoon}
              isAdminActive={isAdminActive}
              isJoinActive={isJoinActive}
              dashboardEnabled={dashboardEnabled}
              notificationsUnread={notificationsUnread}
              avatarUrl={avatarUrl}
              avatarMenuAnchor={avatarMenuAnchor}
              setAvatarMenuAnchor={setAvatarMenuAnchor}
              openJoin={() => void openJoin()}
              openSignIn={() => void openSignIn()}
            />
          )}

          {/* Mobile auth controls */}
          {isMobile && !minimalNavbar && (
            <NavbarMobileAuthControls
              isMobile={isMobile}
              path={path}
              session={session}
              sessionLoaded={sessionLoaded}
              onboardingLoaded={onboardingLoaded}
              showAuthedHeader={showAuthedHeader}
              productionComingSoon={comingSoon}
              isAdminActive={isAdminActive}
              isJoinActive={isJoinActive}
              dashboardEnabled={dashboardEnabled}
              notificationsUnread={notificationsUnread}
              avatarUrl={avatarUrl}
              setDrawerOpen={setDrawerOpen}
              setAvatarMenuAnchor={setAvatarMenuAnchor}
              avatarMenuOpen={Boolean(avatarMenuAnchor)}
            />
          )}
        </Toolbar>

        {/* Account dropdown menu — desktop + mobile share same Menu instance */}
        {showAccountDropdown && (
          <Menu
            anchorEl={avatarMenuAnchor}
            open={Boolean(avatarMenuAnchor)}
            onClose={() => setAvatarMenuAnchor(null)}
            disableScrollLock
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  setAvatarMenuAnchor(null);
                  navigate('/admin');
                }}
                sx={{ py: 1.25, color: 'warning.main' }}
              >
                Admin
              </MenuItem>
            )}
            {dashboardEnabled && (
              <MenuItem
                onClick={() => {
                  setAvatarMenuAnchor(null);
                  navigate('/dashboard');
                }}
                sx={{ py: 1.25 }}
              >
                Profile
              </MenuItem>
            )}
            {dashboardEnabled && (
              <MenuItem
                onClick={() => {
                  setAvatarMenuAnchor(null);
                  navigate('/dashboard/settings');
                }}
                sx={{ py: 1.25 }}
              >
                Settings
              </MenuItem>
            )}
            {(dashboardEnabled || isAdmin) && <Divider sx={{ my: 0.5 }} />}
            <MenuItem
              onClick={() => {
                setAvatarMenuAnchor(null);
                void handleSignOut();
              }}
              disabled={busy}
              sx={{ color: 'text.secondary', py: 1.25 }}
            >
              Sign Out
            </MenuItem>
          </Menu>
        )}
      </AppBar>

      {/* Mobile drawer */}
      <NavbarMobileDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        showAuthedHeader={showAuthedHeader}
        session={session}
        comingSoon={comingSoon}
        isAdminActive={isAdminActive}
        isJoinActive={isJoinActive}
        storeEnabled={storeEnabled}
        gamesEnabled={gamesEnabled}
        groupsEnabled={groupsEnabled}
        isGroupsActive={isGroupsActive}
        path={path}
        location={location}
        drawerPaperSx={{}}
        drawerLinkColor="rgba(255,255,255,0.9)"
        drawerActiveNavSx={{
          bgcolor: 'rgba(156,187,217,0.26)',
          '&:hover': { bgcolor: 'rgba(141,188,229,0.34)' },
        }}
      />

      {/* Join loading backdrop */}
      <Backdrop
        open={joinLoading}
        sx={{
          color: '#FFFFFF',
          zIndex: (t) => t.zIndex.drawer + 2,
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

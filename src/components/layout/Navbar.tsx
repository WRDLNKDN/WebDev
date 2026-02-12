import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Toolbar,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { signInWithOAuth, type OAuthProvider } from '../../lib/signInWithOAuth';
import { supabase } from '../../lib/supabaseClient';

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

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const isFeedActive = path === '/feed';
  const isJoinActive = path === '/join';
  const isDashboardActive =
    path === '/dashboard' || path.startsWith('/dashboard/');

  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signInAnchor, setSignInAnchor] = useState<HTMLElement | null>(null);
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

  // Auth session: IF session exists we show Feed/Dashboard/Sign Out; ELSE Join + Sign in
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSession(data.session ?? null);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt, newSession) => {
        if (!cancelled) setSession(newSession ?? null);
      },
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

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
  }, [searchQuery]);

  const handleSignIn = async (provider: OAuthProvider) => {
    setSignInAnchor(null);
    setBusy(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        '/feed',
      )}`;

      const { data, error } = await signInWithOAuth(provider, { redirectTo });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);

    try {
      await supabase.auth.signOut();
      localStorage.removeItem('sb-wrdlnkdn-auth');
      setSession(null);
      navigate('/');
    } catch (error) {
      console.error(error);
      setBusy(false);
    }
  };

  return (
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
      <Toolbar sx={{ py: 0.5 }}>
        {/* Brand: single static logo (wrdlnkdn_logo.png); no cycling Weirdlings */}
        <Box
          component={RouterLink}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            mr: 3,
            height: '64px',
          }}
        >
          <Box
            component="img"
            src="/assets/wrdlnkdn_logo.png"
            alt="WRDLNKDN"
            sx={{
              height: '32px',
              width: 'auto',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 },
            }}
          />
        </Box>

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
        {session && (
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
                  borderRadius: '18px',
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
                  placeholder="Search for people"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() =>
                    searchQuery.trim().length >= SEARCH_MIN_LENGTH &&
                    setSearchOpen(true)
                  }
                  inputProps={{
                    'aria-label': 'Search for people',
                    'aria-expanded': searchOpen,
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
                    bgcolor: 'rgba(30,30,30,0.98)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {searchLoading ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 2 }}
                    >
                      <CircularProgress size={24} sx={{ color: 'white' }} />
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
                        sx={{ color: 'primary.light', textTransform: 'none' }}
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
                              color: 'white',
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
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
          </>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* AUTH: IF no session → Join + Sign in (with provider menu); ELSE → Admin (if admin) + Sign Out */}
        <Stack direction="row" spacing={2} alignItems="center">
          {!session ? (
            <>
              {/* Guest: Join (to /join) + Sign in (opens Google/Microsoft menu) */}
              <Button
                component={RouterLink}
                to="/join"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'white' },
                  ...(isJoinActive && {
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.12)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                  }),
                }}
              >
                Join
              </Button>

              {/* Sign In: Pill Button */}
              <Button
                variant="outlined"
                onClick={(e) => setSignInAnchor(e.currentTarget)}
                disabled={busy}
                sx={{
                  borderRadius: 20,
                  px: 3,
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
                endIcon={
                  busy ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : undefined
                }
              >
                Sign in
              </Button>

              <Menu
                anchorEl={signInAnchor}
                open={Boolean(signInAnchor)}
                onClose={() => setSignInAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: { sx: { minWidth: 220, mt: 1, borderRadius: 2 } },
                }}
              >
                <MenuItem
                  onClick={() => void handleSignIn('google')}
                  disabled={busy}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon>
                    <GoogleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Google</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => void handleSignIn('azure')}
                  disabled={busy}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon>
                    <MicrosoftIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Microsoft</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
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
                sx={{ color: 'text.secondary' }}
                onClick={() => void signOut()}
                disabled={busy}
              >
                Sign Out
              </Button>
            </>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

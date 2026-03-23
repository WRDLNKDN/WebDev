import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  CircularProgress,
  InputBase,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Popper,
  Stack,
  useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { denseMenuPaperSxFromTheme } from '../../../lib/ui/formSurface';
import type { RefObject } from 'react';

export type SearchMatch = {
  id: string;
  handle: string | null;
  display_name: string | null;
};

type NavbarSearchProps = {
  forcePublicHeader: boolean;
  isMobile: boolean;
  searchAnchorEl: HTMLElement | null;
  setSearchAnchorEl: (el: HTMLElement | null) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchMatches: SearchMatch[];
  searchLoading: boolean;
  searchPopperRef: RefObject<HTMLDivElement | null>;
  closeSearchDropdown: () => void;
  minLength: number;
  maxChars: number;
  onSubmitQuery: (query: string) => void;
  onOpenDirectory: (query: string) => void;
  onOpenProfile: (handle: string) => void;
};

export const NavbarSearch = ({
  forcePublicHeader,
  isMobile,
  searchAnchorEl,
  setSearchAnchorEl,
  searchQuery,
  setSearchQuery,
  searchOpen,
  setSearchOpen,
  searchMatches,
  searchLoading,
  searchPopperRef,
  closeSearchDropdown,
  minLength,
  maxChars,
  onSubmitQuery,
  onOpenDirectory,
  onOpenProfile,
}: NavbarSearchProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  if (isMobile || forcePublicHeader) return null;

  return (
    <Box ref={setSearchAnchorEl} sx={{ position: 'relative', minWidth: 240 }}>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          const query = searchQuery.trim();
          closeSearchDropdown();
          onSubmitQuery(query);
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
          onChange={(e) => setSearchQuery(e.target.value.slice(0, maxChars))}
          onFocus={() =>
            searchQuery.trim().length >= minLength && setSearchOpen(true)
          }
          inputProps={{
            'aria-label': 'Search for members',
            'aria-expanded': searchOpen,
            maxLength: maxChars,
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
            (searchQuery.trim().length >= minLength && !searchLoading))
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
                sx={{ color: isLight ? 'primary.main' : 'white' }}
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
                size="small"
                onClick={() => {
                  onOpenDirectory(searchQuery.trim());
                  closeSearchDropdown();
                }}
                sx={{
                  color: 'primary.light',
                  textTransform: 'none',
                }}
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
                    onClick={() => {
                      setSearchQuery('');
                      closeSearchDropdown();
                      onOpenProfile(handle);
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
  );
};

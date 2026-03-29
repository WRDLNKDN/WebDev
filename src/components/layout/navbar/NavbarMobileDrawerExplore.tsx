import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CampaignIcon from '@mui/icons-material/Campaign';
import ForumIcon from '@mui/icons-material/Forum';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { Link as RouterLink, type Location } from 'react-router-dom';

type NavbarMobileDrawerExploreProps = {
  showAuthedHeader: boolean;
  groupsEnabled: boolean;
  gamesEnabled: boolean;
  isGroupsActive: boolean;
  location: Location;
  onNavigate: () => void;
  /** When set (e.g. from `getNavbarDrawerChrome`), used for active Groups row; else dark-theme fallback. */
  drawerActiveNavSx?: SxProps<Theme>;
};

const groupsActiveFallbackSx = {
  bgcolor: 'rgba(156,187,217,0.26)',
  '&:hover': { bgcolor: 'rgba(141,188,229,0.34)' },
} as const;

export const NavbarMobileDrawerExplore = ({
  showAuthedHeader,
  groupsEnabled,
  gamesEnabled,
  isGroupsActive,
  location,
  onNavigate,
  drawerActiveNavSx,
}: NavbarMobileDrawerExploreProps) => {
  if (!showAuthedHeader) return null;

  return (
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
      {groupsEnabled && (
        <ListItemButton
          component={RouterLink}
          to="/groups"
          onClick={onNavigate}
          sx={{
            minHeight: 44,
            py: 0.5,
            ...(isGroupsActive
              ? (drawerActiveNavSx ?? groupsActiveFallbackSx)
              : {}),
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
        onClick={onNavigate}
        sx={{ minHeight: 44, py: 0.5 }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <BookmarkBorderIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Saved"
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
            onClick={onNavigate}
            sx={{ minHeight: 44, py: 0.5 }}
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
            { to: '/dashboard/games', label: 'Checkers' },
            { to: '/dashboard/games', label: 'Connect 4' },
            { to: '/dashboard/games/hangman', label: 'Hangman' },
            { to: '/dashboard/games', label: 'Phuzzle' },
            { to: '/dashboard/games/snake', label: 'Snake' },
            { to: '/dashboard/games/slots', label: 'Slots' },
            { to: '/dashboard/games', label: 'Tic-Tac-Toe' },
          ].map(({ to, label }) => (
            <ListItemButton
              key={label}
              component={RouterLink}
              to={to}
              onClick={onNavigate}
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
        Platform
      </ListSubheader>
      <ListItemButton
        component={RouterLink}
        to="/advertise"
        state={{ backgroundLocation: location }}
        onClick={onNavigate}
        sx={{ minHeight: 44, py: 0.5 }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <CampaignIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Advertise"
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
        onClick={onNavigate}
        sx={{ minHeight: 44, py: 0.5 }}
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
  );
};

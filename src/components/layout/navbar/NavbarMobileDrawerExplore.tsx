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
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { type Location } from 'react-router-dom';
import { RouterLinkPrefetch } from '../../routing/RouterLinkPrefetch';
import {
  DrawerNavSubheader,
  drawerNavListSx,
  drawerNavRowButtonSx,
} from './navbarDrawerPrimitives';

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

const GAME_QUICK_LINKS = [
  { to: '/dashboard/games', label: 'Checkers' },
  { to: '/dashboard/games', label: 'Connect 4' },
  { to: '/dashboard/games/hangman', label: 'Hangman' },
  { to: '/dashboard/games', label: 'Phuzzle' },
  { to: '/dashboard/games/snake', label: 'Snake' },
  { to: '/dashboard/games/slots', label: 'Slots' },
  { to: '/dashboard/games', label: 'Tic-Tac-Toe' },
] as const;

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
    <List dense disablePadding sx={drawerNavListSx}>
      <DrawerNavSubheader variant="explore">Explore</DrawerNavSubheader>
      <DrawerNavSubheader>Community</DrawerNavSubheader>
      {groupsEnabled && (
        <ListItemButton
          component={RouterLinkPrefetch}
          to="/groups"
          onClick={onNavigate}
          sx={{
            ...drawerNavRowButtonSx,
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
      <DrawerNavSubheader sectionTopSpacing>Your stuff</DrawerNavSubheader>
      <ListItemButton
        component={RouterLinkPrefetch}
        to="/saved"
        onClick={onNavigate}
        sx={drawerNavRowButtonSx}
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
          <DrawerNavSubheader sectionTopSpacing>Games</DrawerNavSubheader>
          <ListItemButton
            component={RouterLinkPrefetch}
            to="/dashboard/games"
            onClick={onNavigate}
            sx={drawerNavRowButtonSx}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <SportsEsportsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="All games"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItemButton>
          {GAME_QUICK_LINKS.map(({ to, label }) => (
            <ListItemButton
              key={label}
              component={RouterLinkPrefetch}
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
      <DrawerNavSubheader sectionTopSpacing>Platform</DrawerNavSubheader>
      <ListItemButton
        component={RouterLinkPrefetch}
        to="/advertise"
        state={{ backgroundLocation: location }}
        onClick={onNavigate}
        sx={drawerNavRowButtonSx}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <CampaignIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Advertise"
          primaryTypographyProps={{ variant: 'body2' }}
        />
      </ListItemButton>
      <DrawerNavSubheader sectionTopSpacing>Support</DrawerNavSubheader>
      <ListItemButton
        component={RouterLinkPrefetch}
        to="/help"
        onClick={onNavigate}
        sx={drawerNavRowButtonSx}
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

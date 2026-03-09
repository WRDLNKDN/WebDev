import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CampaignIcon from '@mui/icons-material/Campaign';
import EventIcon from '@mui/icons-material/Event';
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
import { Link as RouterLink, type Location } from 'react-router-dom';

type NavbarMobileDrawerExploreProps = {
  showAuthedHeader: boolean;
  eventsEnabled: boolean;
  groupsEnabled: boolean;
  gamesEnabled: boolean;
  isGroupsActive: boolean;
  location: Location;
  onNavigate: () => void;
};

export const NavbarMobileDrawerExplore = ({
  showAuthedHeader,
  eventsEnabled,
  groupsEnabled,
  gamesEnabled,
  isGroupsActive,
  location,
  onNavigate,
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
      {eventsEnabled && (
        <ListItemButton
          component={RouterLink}
          to="/events"
          onClick={onNavigate}
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
          onClick={onNavigate}
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
        onClick={onNavigate}
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
        <ListItemButton
          component="a"
          href="https://phuzzle.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
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
        onClick={onNavigate}
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
  );
};

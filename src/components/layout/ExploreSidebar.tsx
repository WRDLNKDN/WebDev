import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CampaignIcon from '@mui/icons-material/Campaign';
import EventIcon from '@mui/icons-material/Event';
import ForumIcon from '@mui/icons-material/Forum';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MessageIcon from '@mui/icons-material/Message';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';

const navItem = (
  to: string,
  primary: string,
  Icon: React.ComponentType<{ fontSize?: 'small' }>,
) => ({
  to,
  primary,
  Icon,
});

const YOUR_STUFF_ITEMS = [
  navItem('/saved', 'Saved', BookmarkBorderIcon),
  navItem('/chat-full', 'Messages', MessageIcon),
];

/**
 * Left-hand Explore nav used on Feed and Saved (and other authenticated surfaces).
 * Hidden on mobile; sticky on desktop.
 */
export const ExploreSidebar = () => {
  const location = useLocation();
  const path = location.pathname;
  const eventsEnabled = useFeatureFlag('events');
  const groupsEnabled = useFeatureFlag('groups');
  const chatEnabled = useFeatureFlag('chat');
  const gamesEnabled = useFeatureFlag('games');

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        position: { xs: 'static', md: 'sticky' },
        top: 88,
        width: '100%',
        maxWidth: { md: 190, lg: 190 },
        minWidth: { md: 145, lg: 145 },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'rgba(156,187,217,0.18)',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Explore
        </Typography>
      </Box>
      <List dense disablePadding sx={{ py: 0.5 }}>
        <ListSubheader
          disableSticky
          sx={{
            px: 2,
            pt: 1.5,
            pb: 0.5,
            bgcolor: 'transparent',
            color: 'text.secondary',
            typography: 'caption',
            lineHeight: 1.66,
          }}
        >
          Community
        </ListSubheader>
        {eventsEnabled && (
          <ListItem disablePadding>
            <ListItemButton
              component={RouterLink}
              to="/events"
              sx={{
                minHeight: 40,
                py: 0.5,
                borderRadius: 0,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <EventIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Events"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          </ListItem>
        )}
        {groupsEnabled && (
          <ListItem disablePadding>
            <ListItemButton
              component={RouterLink}
              to="/groups"
              sx={{
                minHeight: 40,
                py: 0.5,
                borderRadius: 0,
                '&:hover': { bgcolor: 'action.hover' },
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
          </ListItem>
        )}
        <ListSubheader
          disableSticky
          sx={{
            px: 2,
            pt: 1.5,
            pb: 0.5,
            bgcolor: 'transparent',
            color: 'text.secondary',
            typography: 'caption',
            lineHeight: 1.66,
          }}
        >
          Your stuff
        </ListSubheader>
        {YOUR_STUFF_ITEMS.filter(
          (item) => item.to !== '/chat-full' || chatEnabled,
        ).map(({ to, primary, Icon }) => (
          <ListItem key={to} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={to}
              sx={{
                minHeight: 40,
                py: 0.5,
                borderRadius: 0,
                '&:hover': { bgcolor: 'action.hover' },
                ...(path === to || path.startsWith(to + '/')
                  ? { bgcolor: 'action.selected' }
                  : {}),
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={primary}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
        <ListSubheader
          disableSticky
          sx={{
            px: 2,
            pt: 1.5,
            pb: 0.5,
            bgcolor: 'transparent',
            color: 'text.secondary',
            typography: 'caption',
            lineHeight: 1.66,
          }}
        >
          Platform
        </ListSubheader>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/advertise"
            state={{ backgroundLocation: location }}
            sx={{
              minHeight: 40,
              py: 0.5,
              borderRadius: 0,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <CampaignIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Advertise"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItemButton>
        </ListItem>
        {gamesEnabled && (
          <>
            <ListSubheader
              disableSticky
              sx={{
                px: 2,
                pt: 1.5,
                pb: 0.5,
                bgcolor: 'transparent',
                color: 'text.secondary',
                typography: 'caption',
                lineHeight: 1.66,
              }}
            >
              Games
            </ListSubheader>
            <ListItem disablePadding>
              <ListItemButton
                component={RouterLink}
                to="/dashboard/games"
                sx={{
                  minHeight: 40,
                  py: 0.5,
                  borderRadius: 0,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <SportsEsportsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="All games"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
            </ListItem>
            {[
              { to: '/dashboard/games', label: 'Phuzzle' },
              { to: '/dashboard/games/hangman', label: 'Hangman' },
              { to: '/dashboard/games/snake', label: 'Snake' },
              { to: '/dashboard/games/slots', label: 'Slots' },
              { to: '/dashboard/games', label: 'Tic-Tac-Toe' },
              { to: '/dashboard/games', label: 'Connect 4' },
              { to: '/dashboard/games', label: 'Checkers' },
              { to: '/dashboard/games/trivia', label: 'Trivia' },
              { to: '/dashboard/games/2048', label: '2048' },
              { to: '/dashboard/games', label: 'Two Truths and a Lie' },
              { to: '/dashboard/games', label: 'Would You Rather' },
              { to: '/dashboard/games/darts', label: 'Darts' },
              { to: '/dashboard/games/word-search', label: 'Word Search' },
              { to: '/dashboard/games', label: 'Battleship' },
              { to: '/dashboard/games', label: 'Reversi' },
              { to: '/dashboard/games/breakout', label: 'Breakout' },
              { to: '/dashboard/games', label: 'Scrabble' },
              { to: '/dashboard/games', label: 'Tetris' },
              { to: '/dashboard/games', label: 'Maze Chase' },
              { to: '/dashboard/games', label: 'Chess' },
              { to: '/dashboard/games', label: 'Blackjack' },
              { to: '/dashboard/games', label: 'Daily Word' },
              { to: '/dashboard/games', label: 'Caption Game' },
            ].map(({ to, label }) => (
              <ListItem key={label} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={to}
                  sx={{
                    minHeight: 36,
                    py: 0.5,
                    pl: 4,
                    borderRadius: 0,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}
        <ListSubheader
          disableSticky
          sx={{
            px: 2,
            pt: 1.5,
            pb: 0.5,
            bgcolor: 'transparent',
            color: 'text.secondary',
            typography: 'caption',
            lineHeight: 1.66,
          }}
        >
          Support
        </ListSubheader>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/help"
            sx={{
              minHeight: 40,
              py: 0.5,
              borderRadius: 0,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <HelpOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Help"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Paper>
  );
};

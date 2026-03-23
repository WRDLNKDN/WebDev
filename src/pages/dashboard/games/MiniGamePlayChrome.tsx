import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReplayIcon from '@mui/icons-material/Replay';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export const DASHBOARD_GAMES_HUB = '/dashboard/games';

export const MiniGameLoadingNotFound = ({
  loading,
  notFound,
  notFoundMessage = 'Game not found.',
  loadingAriaLabel = 'Loading game',
}: {
  loading: boolean;
  notFound: boolean;
  notFoundMessage?: string;
  loadingAriaLabel?: string;
}) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      {loading && <CircularProgress aria-label={loadingAriaLabel} />}
      {notFound && (
        <Stack spacing={2} alignItems="center">
          <Typography color="text.secondary">{notFoundMessage}</Typography>
          <Button
            component={RouterLink}
            to={DASHBOARD_GAMES_HUB}
            variant="contained"
          >
            Back to Games
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export const MiniGameIntroScreen = ({
  title,
  description,
  startingNew,
  onStartNew,
  startAriaLabel,
  startButtonLabel = 'Start new game',
}: {
  title: string;
  description: string;
  startingNew: boolean;
  onStartNew: () => void;
  startAriaLabel: string;
  startButtonLabel?: string;
}) => {
  return (
    <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Button
          component={RouterLink}
          to={DASHBOARD_GAMES_HUB}
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          size="small"
        >
          Back
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Stack>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 360 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Button
          variant="contained"
          fullWidth
          startIcon={<ReplayIcon />}
          disabled={startingNew}
          onClick={onStartNew}
          aria-label={startAriaLabel}
        >
          {startingNew ? 'Starting…' : startButtonLabel}
        </Button>
      </Paper>
    </Box>
  );
};

export const MiniGamePlayPageRoot = ({ children }: { children: ReactNode }) => (
  <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>{children}</Box>
);

export const MiniGamePlayHeaderRow = ({
  title,
  showStats,
  stats,
}: {
  title: string;
  showStats: boolean;
  stats?: ReactNode;
}) => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{ mb: 2 }}
      flexWrap="wrap"
    >
      <Button
        component={RouterLink}
        to={DASHBOARD_GAMES_HUB}
        startIcon={<ArrowBackIcon />}
        variant="outlined"
        size="small"
        aria-label="Back to Games"
      >
        Back
      </Button>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {showStats ? stats : null}
    </Stack>
  );
};

export const MiniGameGameOverPanel = ({
  summary,
  startingNew,
  onPlayAgain,
}: {
  summary: ReactNode;
  startingNew: boolean;
  onPlayAgain: () => void;
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 360, mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Game over
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {summary}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          startIcon={<ReplayIcon />}
          onClick={onPlayAgain}
          disabled={startingNew}
        >
          Play again
        </Button>
        <Button
          component={RouterLink}
          to={DASHBOARD_GAMES_HUB}
          variant="outlined"
        >
          Back to Games
        </Button>
      </Stack>
    </Paper>
  );
};

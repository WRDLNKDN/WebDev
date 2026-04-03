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
import type { GameSession } from '../../../types/games';

export const DASHBOARD_GAMES_HUB = '/dashboard/games';

/** Pending invite / declined / canceled — shared copy + layout for multiplayer mini-games. */
export function getMiniGameSessionUnavailableMessage(
  session: GameSession,
  isInvitee: boolean,
  copy: { inviteePending: string; hostPending: string },
): string | null {
  const { status } = session;
  if (
    status !== 'pending_invitation' &&
    status !== 'declined' &&
    status !== 'canceled'
  ) {
    return null;
  }
  if (status === 'pending_invitation') {
    return isInvitee ? copy.inviteePending : copy.hostPending;
  }
  if (status === 'declined') return 'This game was declined.';
  return 'This game was canceled.';
}

export const MiniGameSessionUnavailableScreen = ({
  message,
}: {
  message: string;
}) => {
  return (
    <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
      <Button
        component={RouterLink}
        to={DASHBOARD_GAMES_HUB}
        startIcon={<ArrowBackIcon />}
        variant="outlined"
        size="small"
        sx={{ mb: 2 }}
      >
        Back to Games
      </Button>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 360 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {message}
        </Typography>
        <Button
          component={RouterLink}
          to={DASHBOARD_GAMES_HUB}
          variant="contained"
          fullWidth
        >
          Go to Games
        </Button>
      </Paper>
    </Box>
  );
};

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
    <Box
      sx={{ display: 'flex', justifyContent: 'center', py: { xs: 2.5, sm: 3 } }}
    >
      {loading && <CircularProgress aria-label={loadingAriaLabel} />}
      {notFound && (
        <Paper
          variant="outlined"
          sx={{
            width: '100%',
            maxWidth: 420,
            px: { xs: 2.25, sm: 3 },
            py: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Stack spacing={1.75} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              404
            </Typography>
            <Typography color="text.secondary">{notFoundMessage}</Typography>
            <Button
              component={RouterLink}
              to={DASHBOARD_GAMES_HUB}
              variant="contained"
            >
              Back to Games
            </Button>
          </Stack>
        </Paper>
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
  actions,
}: {
  title: string;
  showStats: boolean;
  stats?: ReactNode;
  actions?: ReactNode;
}) => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 2 }}
      flexWrap="wrap"
      gap={2}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
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
      </Stack>
      {showStats || actions ? (
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          {showStats ? stats : null}
          {actions ?? null}
        </Stack>
      ) : null}
    </Stack>
  );
};

export const MiniGameGameOverPanel = ({
  title = 'Game over',
  summary,
  startingNew,
  onPlayAgain,
  playAgainLabel = 'Play again',
}: {
  title?: ReactNode;
  summary: ReactNode;
  startingNew: boolean;
  onPlayAgain: () => void;
  playAgainLabel?: string;
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 360, mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
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
          {playAgainLabel}
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

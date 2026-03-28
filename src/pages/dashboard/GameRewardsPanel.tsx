import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useGameSessions } from '../../hooks/useGameSessions';
import {
  getResultForUser,
  isCompetitiveMultiplayer,
} from '../../lib/games/socialSummary';

type RewardBadge = {
  label: string;
  detail: string;
};

const badgeSx = {
  px: 1.25,
  py: 0.85,
  borderRadius: 999,
  border: '1px solid rgba(91, 192, 190, 0.24)',
  background:
    'linear-gradient(135deg, rgba(28,44,60,0.9) 0%, rgba(14,22,33,0.92) 100%)',
} as const;

export const GameRewardsPanel = () => {
  const { currentUserId, sessions, waitingOnYou, loading } = useGameSessions();

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dailyChallengeTypes = new Set(['daily_word', 'hangman', '2048']);
    const completedToday = sessions.filter(
      (session) =>
        session.status === 'completed' &&
        dailyChallengeTypes.has(
          (session.game_definition as { game_type?: string } | undefined)
            ?.game_type ?? '',
        ) &&
        session.updated_at.slice(0, 10) === today,
    ).length;
    const competitiveCompleted = sessions
      .filter(
        (session) =>
          session.status === 'completed' && isCompetitiveMultiplayer(session),
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const waitingTurns = waitingOnYou.filter((session) =>
      isCompetitiveMultiplayer(session),
    ).length;
    let hotStreak = 0;
    if (currentUserId) {
      for (const session of competitiveCompleted) {
        if (getResultForUser(session, currentUserId) !== 'win') break;
        hotStreak += 1;
      }
    }

    const rewards: RewardBadge[] = [];
    if (completedToday > 0) {
      rewards.push({
        label: 'Daily Challenger',
        detail:
          completedToday === 1
            ? 'You cleared a daily challenge today.'
            : `You cleared ${completedToday} daily challenges today.`,
      });
    }
    if (competitiveCompleted.length >= 3) {
      rewards.push({
        label: 'Social Player',
        detail: `${competitiveCompleted.length} multiplayer games finished.`,
      });
    }
    if (waitingTurns > 0) {
      rewards.push({
        label: 'Rivalry Ready',
        detail:
          waitingTurns === 1
            ? 'One friend game is waiting on your move.'
            : `${waitingTurns} friend games are waiting on your move.`,
      });
    }
    if (hotStreak >= 2) {
      rewards.push({
        label: 'Hot Streak',
        detail: `${hotStreak} straight competitive wins.`,
      });
    }

    return {
      completedToday,
      multiplayerFinishes: competitiveCompleted.length,
      waitingTurns,
      hotStreak,
      rewards,
    };
  }, [currentUserId, sessions, waitingOnYou]);

  if (loading && sessions.length === 0) {
    return (
      <Box
        sx={{
          borderTop: '1px solid rgba(156,187,217,0.18)',
          pt: 1.5,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (summary.rewards.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        pt: 1.5,
        borderTop: '1px solid rgba(156,187,217,0.18)',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1,
          fontWeight: 700,
          letterSpacing: 0.6,
          color: 'text.secondary',
          textTransform: 'uppercase',
          fontSize: '0.68rem',
        }}
      >
        Game room
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        {summary.completedToday > 0
          ? `${summary.completedToday} daily clears today`
          : 'No daily clears yet today'}
        {' · '}
        {summary.waitingTurns} turns waiting
        {' · '}
        {summary.multiplayerFinishes} multiplayer finishes
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {summary.rewards.map((reward) => (
          <Box key={reward.label} sx={badgeSx}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
              {reward.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {reward.detail}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

/**
 * Darts: 301/501 score-based game. Solo or multiplayer; 3 throws per turn;
 * turn order rotates; win when a player reaches 0 (bust on negative or 1).
 * State persists in game_sessions.state_payload.
 */
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createDartsSoloSession,
  fetchSessionForGameType,
  submitDartsThrow,
  type DartsStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import type { GameSession } from '../../types/games';
import {
  MiniGameGameOverPanel,
  MiniGameIntroScreen,
  MiniGameLoadingNotFound,
  MiniGamePlayHeaderRow,
  MiniGamePlayPageRoot,
} from './games/MiniGamePlayChrome';

const SEGMENTS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];
type Modifier = 'single' | 'double' | 'triple';

function getState(session: GameSession): DartsStatePayload {
  const raw = session.state_payload as DartsStatePayload | undefined;
  return {
    startingScore: raw?.startingScore ?? 501,
    playerOrder: raw?.playerOrder ?? [],
    scores: raw?.scores ?? {},
    currentPlayerIndex: raw?.currentPlayerIndex ?? 0,
    currentTurnThrows: raw?.currentTurnThrows ?? [],
    throwHistory: raw?.throwHistory ?? [],
    winnerId: raw?.winnerId ?? null,
  };
}

function getCurrentThrowPoints(
  segment: number | 'bull' | 'doubleBull' | 'miss',
  mod: Modifier,
): number {
  if (segment === 'miss') return 0;
  if (segment === 'bull') return 25;
  if (segment === 'doubleBull') return 50;
  const s = segment as number;
  if (mod === 'single') return s;
  if (mod === 'double') return s * 2;
  return s * 3;
}

export const DartsPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acting, setActing] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [segment, setSegment] = useState<
    number | 'bull' | 'doubleBull' | 'miss' | null
  >(null);
  const [modifier, setModifier] = useState<Modifier>('single');

  useEffect(() => {
    void supabase.auth.getSession().then((s) => {
      setUserId(s.data.session?.user?.id ?? null);
    });
  }, []);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'darts');
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    setSession(s);
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setLoading(false);
      setSession(null);
      return;
    }
    setLoading(true);
    void loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const pollInterval = session?.id && session.status === 'active' ? 3000 : 0;
  useEffect(() => {
    if (!pollInterval || !sessionId) return;
    const t = setInterval(() => void loadSession(sessionId), pollInterval);
    return () => clearInterval(t);
  }, [pollInterval, sessionId, loadSession]);

  const state = session ? getState(session) : null;
  const playerOrder = state?.playerOrder ?? [];
  const currentIndex = state?.currentPlayerIndex ?? 0;
  const currentPlayerId = playerOrder[currentIndex];
  const isMyTurn = userId === currentPlayerId;
  const currentThrows = state?.currentTurnThrows ?? [];
  const throwsLeft = 3 - currentThrows.length;
  const completed = session?.status === 'completed';
  const winnerId = state?.winnerId ?? null;
  const startingScore = state?.startingScore ?? 501;
  const isSolo = playerOrder.length <= 1;

  const handleThrow = useCallback(
    async (points: number) => {
      if (!session?.id || !isMyTurn || acting || completed || throwsLeft <= 0)
        return;
      setActing(true);
      try {
        await submitDartsThrow(session.id, points);
        await loadSession(session.id);
        setSegment(null);
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setActing(false);
      }
    },
    [session, isMyTurn, acting, completed, throwsLeft, loadSession, showToast],
  );

  const handleSelectAndThrow = useCallback(() => {
    if (segment === null) return;
    const points =
      segment === 'miss'
        ? 0
        : segment === 'bull'
          ? 25
          : segment === 'doubleBull'
            ? 50
            : getCurrentThrowPoints(segment as number, modifier);
    void handleThrow(points);
  }, [segment, modifier, handleThrow]);

  const handleStartNew = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createDartsSoloSession();
      navigate(`/dashboard/games/darts/${newSession.id}`, { replace: true });
      setSession(newSession);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStartingNew(false);
    }
  }, [navigate, showToast]);

  if (loading) {
    return <MiniGameLoadingNotFound loading notFound={false} />;
  }

  if (notFound) {
    return (
      <MiniGameLoadingNotFound
        loading={false}
        notFound
        notFoundMessage="Session not found or not a Darts game."
      />
    );
  }

  if (!sessionId?.trim() && !session) {
    return (
      <MiniGameIntroScreen
        title="Darts"
        description="Start a Darts game."
        startingNew={startingNew}
        onStartNew={() => {
          void handleStartNew();
        }}
        startAriaLabel="Start new Darts game"
        startButtonLabel="New solo game"
      />
    );
  }

  if (!session || !state) return null;

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Darts"
        showStats
        stats={
          <Typography variant="body2" color="text.secondary">
            {startingScore} ·{' '}
            {isSolo
              ? 'Solo'
              : `Turn: ${currentIndex + 1}/${playerOrder.length}`}
          </Typography>
        }
      />

      {completed ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {playerOrder.map((id) => (
              <Chip
                key={id}
                label={`${id === userId ? 'You' : id.slice(0, 8)}: ${state.scores?.[id] ?? startingScore}`}
                color={id === winnerId ? 'primary' : 'default'}
              />
            ))}
          </Stack>
          <MiniGameGameOverPanel
            title={winnerId === userId ? 'You win!' : 'Game over'}
            summary={`Winner: ${winnerId?.slice(0, 8)}…`}
            startingNew={startingNew}
            onPlayAgain={() => {
              void handleStartNew();
            }}
            playAgainLabel="New game"
          />
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Scores (remaining)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
              {playerOrder.map((id) => (
                <Chip
                  key={id}
                  label={`${id === userId ? 'You' : `P${playerOrder.indexOf(id) + 1}`}: ${state.scores?.[id] ?? startingScore}`}
                  color={id === currentPlayerId ? 'primary' : 'default'}
                  variant={id === currentPlayerId ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Paper>

          {!isMyTurn && !isSolo && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Waiting for the other player&apos;s turn.
            </Typography>
          )}

          {isMyTurn && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Your turn · Throw {currentThrows.length + 1} of 3
              </Typography>
              {currentThrows.length > 0 && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  This turn: {currentThrows.join(' + ')} ={' '}
                  {currentThrows.reduce((a, b) => a + b, 0)}
                </Typography>
              )}
              <ToggleButtonGroup
                value={modifier}
                exclusive
                onChange={(_, v) => v != null && setModifier(v)}
                size="small"
                sx={{ mt: 1 }}
              >
                <ToggleButton value="single">Single</ToggleButton>
                <ToggleButton value="double">Double</ToggleButton>
                <ToggleButton value="triple">Triple</ToggleButton>
              </ToggleButtonGroup>
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant={segment === 'miss' ? 'contained' : 'outlined'}
                  onClick={() => setSegment('miss')}
                >
                  Miss (0)
                </Button>
                <Button
                  size="small"
                  variant={segment === 'bull' ? 'contained' : 'outlined'}
                  onClick={() => setSegment('bull')}
                >
                  Bull 25
                </Button>
                <Button
                  size="small"
                  variant={segment === 'doubleBull' ? 'contained' : 'outlined'}
                  onClick={() => setSegment('doubleBull')}
                >
                  DB 50
                </Button>
                {SEGMENTS.map((s) => (
                  <Button
                    key={s}
                    size="small"
                    variant={segment === s ? 'contained' : 'outlined'}
                    onClick={() => setSegment(s)}
                  >
                    {s}
                  </Button>
                ))}
              </Stack>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  disabled={acting || segment === null}
                  onClick={() => void handleSelectAndThrow()}
                >
                  {acting
                    ? 'Recording…'
                    : `Record throw${segment != null && typeof segment === 'number' ? ` (${getCurrentThrowPoints(segment, modifier)})` : ''}`}
                </Button>
              </Box>
            </Paper>
          )}

          {state.throwHistory && state.throwHistory.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Last turns
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {state.throwHistory
                  .slice(-5)
                  .reverse()
                  .map((t, i) => (
                    <Typography key={i} variant="body2">
                      {t.playerId === userId
                        ? 'You'
                        : `P${playerOrder.indexOf(t.playerId) + 1}`}
                      : [{t.throws.join(', ')}] = {t.turnTotal}
                    </Typography>
                  ))}
              </Stack>
            </Paper>
          )}
        </>
      )}
    </MiniGamePlayPageRoot>
  );
};

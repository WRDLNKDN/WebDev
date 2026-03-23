/**
 * Solo Slots: reel-based slot machine for light entertainment only.
 * No real-money wagering, no currency, no redeemable prizes—cosmetic/play only.
 * User spins, reels animate and stop, result is displayed; can spin again immediately.
 */
import ReplayIcon from '@mui/icons-material/Replay';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createSlotsSession, fetchSessionById } from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';
import {
  MiniGameIntroScreen,
  MiniGameLoadingNotFound,
  MiniGamePlayHeaderRow,
  MiniGamePlayPageRoot,
} from './games/MiniGamePlayChrome';

const SYMBOLS = ['Cherry', 'Lemon', 'Orange', 'Bar', 'Seven', 'Star'] as const;
type Symbol = (typeof SYMBOLS)[number];

const REEL_SPIN_MS = 1600;
const REEL_STAGGER_MS = 200;
const SYMBOL_HEIGHT_PX = 56;

function pickRandomSymbol(): Symbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function evaluateResult(reels: [Symbol, Symbol, Symbol]): 'win' | 'lose' {
  const [a, b, c] = reels;
  return a === b && b === c ? 'win' : 'lose';
}

export const SlotsPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const [displayIndices, setDisplayIndices] = useState<
    [number, number, number]
  >([0, 0, 0]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<'win' | 'lose' | null>(null);
  const stoppedRef = useRef<[boolean, boolean, boolean]>([false, false, false]);
  const spinCleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      spinCleanupRef.current?.();
    },
    [],
  );

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'slots') {
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
    loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const spin = useCallback(() => {
    if (isSpinning) return;
    const outcome: [Symbol, Symbol, Symbol] = [
      pickRandomSymbol(),
      pickRandomSymbol(),
      pickRandomSymbol(),
    ];
    const outcomeIndices: [number, number, number] = [
      SYMBOLS.indexOf(outcome[0]),
      SYMBOLS.indexOf(outcome[1]),
      SYMBOLS.indexOf(outcome[2]),
    ];
    setLastResult(null);
    setIsSpinning(true);
    stoppedRef.current = [false, false, false];

    const spinInterval = setInterval(() => {
      setDisplayIndices((prev) => {
        const s = stoppedRef.current;
        return [
          s[0] ? prev[0] : (prev[0] + 1) % SYMBOLS.length,
          s[1] ? prev[1] : (prev[1] + 1) % SYMBOLS.length,
          s[2] ? prev[2] : (prev[2] + 1) % SYMBOLS.length,
        ];
      });
    }, 80);

    const t0 = REEL_SPIN_MS;
    const t1 = t0 + REEL_STAGGER_MS;
    const t2 = t1 + REEL_STAGGER_MS;
    const timeout0 = setTimeout(() => {
      stoppedRef.current[0] = true;
      setDisplayIndices((prev) => [outcomeIndices[0], prev[1], prev[2]]);
    }, t0);
    const timeout1 = setTimeout(() => {
      stoppedRef.current[1] = true;
      setDisplayIndices((prev) => [
        outcomeIndices[0],
        outcomeIndices[1],
        prev[2],
      ]);
    }, t1);
    const timeout2 = setTimeout(() => {
      clearInterval(spinInterval);
      setDisplayIndices(outcomeIndices);
      setLastResult(evaluateResult(outcome));
      setIsSpinning(false);
    }, t2);

    const cleanup = () => {
      clearInterval(spinInterval);
      clearTimeout(timeout0);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
    spinCleanupRef.current = cleanup;
  }, [isSpinning]);

  const handlePlayAgain = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createSlotsSession();
      navigate(`/dashboard/games/slots/${newSession.id}`, { replace: true });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStartingNew(false);
    }
  }, [navigate, showToast]);

  if (loading || notFound) {
    return <MiniGameLoadingNotFound loading={loading} notFound={notFound} />;
  }

  if (!sessionId) {
    return (
      <MiniGameIntroScreen
        title="Slots"
        description="Spin the reels for fun. Match three symbols to win. No real-money play—entertainment only."
        startingNew={startingNew}
        onStartNew={() => void handlePlayAgain()}
        startAriaLabel="Start Slots game"
        startButtonLabel="Start game"
      />
    );
  }

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow title="Slots" showStats={false} />

      <Paper
        variant="outlined"
        sx={{ p: 2, display: 'inline-block', bgcolor: 'grey.900' }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mb: 1 }}
        >
          For fun only—no real-money play
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          sx={{ mb: 2 }}
        >
          {([0, 1, 2] as const).map((reelIndex) => (
            <Box
              key={reelIndex}
              sx={{
                width: 72,
                height: SYMBOL_HEIGHT_PX + 16,
                border: '3px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'grey.800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={`Reel ${reelIndex + 1}: ${SYMBOLS[displayIndices[reelIndex]]}`}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: 'primary.contrastText',
                  textAlign: 'center',
                  transition: isSpinning ? 'none' : 'transform 0.1s ease',
                }}
              >
                {SYMBOLS[displayIndices[reelIndex]]}
              </Typography>
            </Box>
          ))}
        </Stack>

        {lastResult !== null && (
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              mb: 2,
              color: lastResult === 'win' ? 'success.main' : 'text.secondary',
              fontWeight: 700,
            }}
            aria-live="polite"
          >
            {lastResult === 'win' ? 'You win!' : 'Try again'}
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={isSpinning}
          onClick={() => spin()}
          aria-label={isSpinning ? 'Reels spinning' : 'Spin'}
          startIcon={!isSpinning ? <ReplayIcon /> : undefined}
        >
          {isSpinning ? 'Spinning…' : 'Spin'}
        </Button>
      </Paper>
    </MiniGamePlayPageRoot>
  );
};

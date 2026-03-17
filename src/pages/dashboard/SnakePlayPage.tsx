/**
 * Solo Snake: arcade-style game. Snake moves automatically; player controls direction.
 * Collect targets to grow and score. Game ends on wall or self collision.
 * In-progress state does not persist; score is recorded on game over when session exists.
 */
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  completeSession,
  createSnakeSession,
  fetchSessionById,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';

const ROWS = 15;
const COLS = 15;
const CELL_PX = 18;
const TICK_MS = 120;

type Direction = 'up' | 'down' | 'left' | 'right';

const DELTA: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function randomCell(snakeBody: number[][]): [number, number] {
  const exclude = new Set(snakeBody.map(([r, c]) => `${r},${c}`));
  let r: number;
  let c: number;
  do {
    r = Math.floor(Math.random() * ROWS);
    c = Math.floor(Math.random() * COLS);
  } while (exclude.has(`${r},${c}`));
  return [r, c];
}

export const SnakePlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'gameover'>(
    'idle',
  );
  const [snake, setSnake] = useState<number[][]>(() => {
    const midR = Math.floor(ROWS / 2);
    const midC = Math.floor(COLS / 2);
    return [
      [midR, midC],
      [midR, midC - 1],
      [midR, midC - 2],
    ];
  });
  const [target, setTarget] = useState<[number, number]>(() =>
    randomCell([[Math.floor(ROWS / 2), Math.floor(COLS / 2)]]),
  );
  const [score, setScore] = useState(0);
  const directionRef = useRef<Direction>('right');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const snakeRef = useRef(snake);
  const targetRef = useRef(target);
  const scoreRef = useRef(0);
  snakeRef.current = snake;
  targetRef.current = target;
  scoreRef.current = score;

  const startGame = useCallback(() => {
    const midR = Math.floor(ROWS / 2);
    const midC = Math.floor(COLS / 2);
    const initialSnake: number[][] = [
      [midR, midC],
      [midR, midC - 1],
      [midR, midC - 2],
    ];
    const initialTarget = randomCell(initialSnake);
    setSnake(initialSnake);
    setTarget(initialTarget);
    setScore(0);
    snakeRef.current = initialSnake;
    targetRef.current = initialTarget;
    scoreRef.current = 0;
    directionRef.current = 'right';
    setGameStatus('playing');
  }, []);

  const loadSession = useCallback(
    async (id: string) => {
      const s = await fetchSessionById(id);
      if (!s) {
        setNotFound(true);
        setSession(null);
        return;
      }
      const def = s.game_definition as { game_type?: string } | undefined;
      if (def?.game_type !== 'snake') {
        setNotFound(true);
        setSession(null);
        return;
      }
      setSession(s);
      sessionIdRef.current = s.id;
      setNotFound(false);
      startGame();
    },
    [startGame],
  );

  useEffect(() => {
    if (!sessionId?.trim()) {
      setLoading(false);
      setSession(null);
      sessionIdRef.current = null;
      return;
    }
    setLoading(true);
    loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const recordScoreAndEnd = useCallback(
    async (finalScore: number) => {
      const sid = sessionIdRef.current;
      if (sid) {
        try {
          await completeSession(sid, 'solved', { score: finalScore });
        } catch (e) {
          showToast({ message: toMessage(e), severity: 'error' });
        }
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const tick = () => {
      const prevSnake = snakeRef.current;
      const prevTarget = targetRef.current;
      const dir = directionRef.current;
      const [dr, dc] = DELTA[dir];
      const [hr, hc] = prevSnake[0];
      const nextHead: [number, number] = [hr + dr, hc + dc];

      if (
        nextHead[0] < 0 ||
        nextHead[0] >= ROWS ||
        nextHead[1] < 0 ||
        nextHead[1] >= COLS
      ) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setGameStatus('gameover');
        void recordScoreAndEnd(scoreRef.current);
        return;
      }
      const hitSelf = prevSnake.some(
        ([r, c]) => r === nextHead[0] && c === nextHead[1],
      );
      if (hitSelf) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setGameStatus('gameover');
        void recordScoreAndEnd(scoreRef.current);
        return;
      }

      const hitTarget =
        nextHead[0] === prevTarget[0] && nextHead[1] === prevTarget[1];
      if (hitTarget) {
        const newBody = [nextHead, ...prevSnake];
        const nextTarget = randomCell(newBody);
        snakeRef.current = newBody;
        targetRef.current = nextTarget;
        scoreRef.current = scoreRef.current + 1;
        setSnake(newBody);
        setTarget(nextTarget);
        setScore(scoreRef.current);
      } else {
        const newBody = [nextHead, ...prevSnake.slice(0, -1)];
        snakeRef.current = newBody;
        setSnake(newBody);
      }
    };

    intervalRef.current = setInterval(tick, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [gameStatus, recordScoreAndEnd]);

  const setDirection = useCallback(
    (dir: Direction) => {
      if (gameStatus !== 'playing') return;
      const current = directionRef.current;
      if (dir === OPPOSITE[current]) return;
      directionRef.current = dir;
    },
    [gameStatus],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          setDirection('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setDirection('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          setDirection('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          setDirection('right');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setDirection]);

  const handlePlayAgain = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createSnakeSession();
      navigate(`/dashboard/games/snake/${newSession.id}`, { replace: true });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStartingNew(false);
    }
  }, [navigate, showToast]);

  if (loading || notFound) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        {loading && <CircularProgress aria-label="Loading game" />}
        {notFound && (
          <Stack spacing={2} alignItems="center">
            <Typography color="text.secondary">Game not found.</Typography>
            <Button
              component={RouterLink}
              to="/dashboard/games"
              variant="contained"
            >
              Back to Games
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  if (!sessionId) {
    return (
      <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            size="small"
          >
            Back
          </Button>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Snake
          </Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 360 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Control the snake with arrow keys or WASD. Collect targets to grow.
            Avoid walls and yourself.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<ReplayIcon />}
            disabled={startingNew}
            onClick={() => void handlePlayAgain()}
            aria-label="Start new Snake game"
          >
            {startingNew ? 'Starting…' : 'Start new game'}
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!session) return null;

  const bodySet = new Set(snake.map(([r, c]) => `${r},${c}`));
  const isTarget = (r: number, c: number) => target[0] === r && target[1] === c;

  return (
    <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            size="small"
            aria-label="Back to Games"
          >
            Back
          </Button>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Snake
          </Typography>
        </Stack>
        <Typography variant="body1" sx={{ fontWeight: 600 }} aria-live="polite">
          Score: {score}
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 1, display: 'inline-block' }}>
        {gameStatus === 'gameover' && (
          <Typography
            variant="body1"
            color="error.main"
            sx={{ textAlign: 'center', mb: 1 }}
          >
            Game over
          </Typography>
        )}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${CELL_PX}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL_PX}px)`,
            gap: 0,
            bgcolor: 'grey.900',
            border: '1px solid',
            borderColor: 'divider',
          }}
          role="img"
          aria-label={`Snake game board. Score: ${score}. ${gameStatus === 'gameover' ? 'Game over.' : 'Use arrow keys or WASD to move.'}`}
        >
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => (
              <Box
                key={`${r}-${c}`}
                sx={{
                  width: CELL_PX - 1,
                  height: CELL_PX - 1,
                  bgcolor: bodySet.has(`${r},${c}`)
                    ? 'primary.main'
                    : isTarget(r, c)
                      ? 'error.main'
                      : 'grey.800',
                  borderRadius:
                    bodySet.has(`${r},${c}`) || isTarget(r, c) ? 1 : 0,
                }}
              />
            )),
          )}
        </Box>

        <Stack
          direction="row"
          justifyContent="center"
          spacing={1}
          sx={{ mt: 2 }}
        >
          <Button
            variant="outlined"
            size="small"
            disabled={gameStatus !== 'playing'}
            onClick={() => setDirection('up')}
            aria-label="Move up"
          >
            ↑
          </Button>
        </Stack>
        <Stack direction="row" justifyContent="center" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            disabled={gameStatus !== 'playing'}
            onClick={() => setDirection('left')}
            aria-label="Move left"
          >
            ←
          </Button>
          <Box sx={{ width: 40 }} />
          <Button
            variant="outlined"
            size="small"
            disabled={gameStatus !== 'playing'}
            onClick={() => setDirection('right')}
            aria-label="Move right"
          >
            →
          </Button>
        </Stack>
        <Stack direction="row" justifyContent="center" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            disabled={gameStatus !== 'playing'}
            onClick={() => setDirection('down')}
            aria-label="Move down"
          >
            ↓
          </Button>
        </Stack>

        {gameStatus === 'gameover' && (
          <Stack
            direction="row"
            justifyContent="center"
            spacing={1}
            sx={{ mt: 2 }}
          >
            <Button
              variant="contained"
              startIcon={<ReplayIcon />}
              onClick={() => void handlePlayAgain()}
              disabled={startingNew}
              aria-label="Play again"
            >
              {startingNew ? 'Starting…' : 'Play again'}
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

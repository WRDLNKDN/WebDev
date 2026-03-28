/**
 * Solo Snake: arcade-style game. Snake moves automatically; player controls direction.
 * Collect targets to grow and score. Game ends on wall or self collision.
 * Active runs are snapshotted so players can refresh and resume.
 */
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  completeSession,
  createSnakeSession,
  fetchSessionById,
  updateSessionState,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';
import {
  MiniGameGameOverPanel,
  MiniGameIntroScreen,
  MiniGameLoadingNotFound,
  MiniGamePlayHeaderRow,
  MiniGamePlayPageRoot,
} from './games/MiniGamePlayChrome';

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

type SnakeStatePayload = {
  snake?: number[][];
  target?: [number, number];
  score?: number;
  direction?: Direction;
  status?: 'idle' | 'playing' | 'gameover';
};

function getPersistedSnakeState(session: GameSession): SnakeStatePayload {
  const raw = session.state_payload as SnakeStatePayload | undefined;
  return {
    snake: Array.isArray(raw?.snake) ? raw.snake : undefined,
    target:
      Array.isArray(raw?.target) &&
      raw.target.length === 2 &&
      typeof raw.target[0] === 'number' &&
      typeof raw.target[1] === 'number'
        ? raw.target
        : undefined,
    score: typeof raw?.score === 'number' ? raw.score : undefined,
    direction:
      raw?.direction === 'up' ||
      raw?.direction === 'down' ||
      raw?.direction === 'left' ||
      raw?.direction === 'right'
        ? raw.direction
        : undefined,
    status:
      raw?.status === 'idle' ||
      raw?.status === 'playing' ||
      raw?.status === 'gameover'
        ? raw.status
        : undefined,
  };
}

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
  const lastPersistAtRef = useRef(0);
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

  const persistRunState = useCallback(
    async (patch?: Partial<SnakeStatePayload>) => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        await updateSessionState(sid, {
          snake: snakeRef.current,
          target: targetRef.current,
          score: scoreRef.current,
          direction: directionRef.current,
          status: gameStatus === 'gameover' ? 'gameover' : 'playing',
          ...patch,
        });
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      }
    },
    [gameStatus, showToast],
  );

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
      const persisted = getPersistedSnakeState(s);
      if (
        Array.isArray(persisted.snake) &&
        persisted.snake.length >= 1 &&
        persisted.target
      ) {
        const restoredSnake = persisted.snake.map(([r, c]) => [r, c]);
        const restoredTarget: [number, number] = [
          persisted.target[0],
          persisted.target[1],
        ];
        const restoredDirection = persisted.direction ?? 'right';
        const restoredScore = persisted.score ?? 0;
        const restoredStatus =
          s.status === 'completed'
            ? 'gameover'
            : persisted.status === 'idle'
              ? 'playing'
              : (persisted.status ?? 'playing');
        setSnake(restoredSnake);
        setTarget(restoredTarget);
        setScore(restoredScore);
        setGameStatus(restoredStatus);
        snakeRef.current = restoredSnake;
        targetRef.current = restoredTarget;
        scoreRef.current = restoredScore;
        directionRef.current = restoredDirection;
      } else {
        startGame();
      }
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
        void persistRunState({ status: 'gameover' });
        recordScoreAndEnd(scoreRef.current);
        return;
      }
      const hitSelf = prevSnake.some(
        ([r, c]) => r === nextHead[0] && c === nextHead[1],
      );
      if (hitSelf) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setGameStatus('gameover');
        void persistRunState({ status: 'gameover' });
        recordScoreAndEnd(scoreRef.current);
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
        void persistRunState({
          snake: newBody,
          target: nextTarget,
          score: scoreRef.current,
        });
      } else {
        const newBody = [nextHead, ...prevSnake.slice(0, -1)];
        snakeRef.current = newBody;
        setSnake(newBody);
        if (Date.now() - lastPersistAtRef.current >= 900) {
          lastPersistAtRef.current = Date.now();
          void persistRunState({ snake: newBody });
        }
      }
    };

    intervalRef.current = setInterval(tick, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [gameStatus, persistRunState, recordScoreAndEnd]);

  const setDirection = useCallback(
    (dir: Direction) => {
      if (gameStatus !== 'playing') return;
      const current = directionRef.current;
      if (dir === OPPOSITE[current]) return;
      directionRef.current = dir;
      void persistRunState({ direction: dir });
    },
    [gameStatus, persistRunState],
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
    return <MiniGameLoadingNotFound loading={loading} notFound={notFound} />;
  }

  if (!sessionId) {
    return (
      <MiniGameIntroScreen
        title="Snake"
        description="Control the snake with arrow keys or WASD. Collect targets to grow. Avoid walls and yourself."
        startingNew={startingNew}
        onStartNew={async () => {
          await handlePlayAgain();
        }}
        startAriaLabel="Start new Snake game"
      />
    );
  }

  if (!session) return null;

  const bodySet = new Set(snake.map(([r, c]) => `${r},${c}`));
  const isTarget = (r: number, c: number) => target[0] === r && target[1] === c;

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Snake"
        showStats={gameStatus === 'playing'}
        stats={
          <Typography
            variant="body1"
            sx={{ fontWeight: 600 }}
            aria-live="polite"
          >
            Score: {score}
          </Typography>
        }
      />

      {gameStatus === 'gameover' && (
        <MiniGameGameOverPanel
          summary={`Final score: ${score}`}
          startingNew={startingNew}
          onPlayAgain={async () => {
            await handlePlayAgain();
          }}
        />
      )}

      <Paper variant="outlined" sx={{ p: 1, display: 'inline-block' }}>
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
      </Paper>
    </MiniGamePlayPageRoot>
  );
};

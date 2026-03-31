/**
 * Breakout: solo arcade. Paddle at bottom, ball bounces and destroys bricks.
 * Score increases per brick; game ends when all lives lost.
 * State persisted in game_sessions.state_payload; client runs game loop.
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
  createBreakoutSession,
  fetchSessionForGameType,
  updateSessionState,
  type BreakoutStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';

const WIDTH = 400;
const HEIGHT = 500;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 12;
const PADDLE_Y = HEIGHT - 40;
const BALL_RADIUS = 6;
const BALL_SPEED = 4;
const BRICK_ROWS = 4;
const BRICK_COLS = 10;
const BRICK_GAP = 4;
const BRICK_TOP = 60;
const POINTS_PER_BRICK = 10;

function getState(session: GameSession): BreakoutStatePayload {
  const raw = session.state_payload as BreakoutStatePayload | undefined;
  const rows = raw?.brickRows ?? BRICK_ROWS;
  const cols = raw?.brickCols ?? BRICK_COLS;
  const total = rows * cols;
  const remaining = Array.isArray(raw?.bricksRemaining)
    ? raw.bricksRemaining.filter(
        (n) => typeof n === 'number' && n >= 0 && n < total,
      )
    : Array.from({ length: total }, (_, i) => i);
  return {
    score: typeof raw?.score === 'number' ? raw.score : 0,
    lives: typeof raw?.lives === 'number' ? raw.lives : 3,
    brickRows: rows,
    brickCols: cols,
    bricksRemaining: remaining,
  };
}

function brickRect(
  index: number,
  cols: number,
): { x: number; y: number; w: number; h: number } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const totalGapW = (cols + 1) * BRICK_GAP;
  const w = (WIDTH - totalGapW) / cols;
  const h = 18;
  const x = BRICK_GAP + col * (w + BRICK_GAP);
  const y = BRICK_TOP + row * (h + BRICK_GAP);
  return { x, y, w, h };
}

function getBrickRects(
  remaining: number[],
  cols: number,
): { index: number; x: number; y: number; w: number; h: number }[] {
  return remaining.map((index) => {
    const r = brickRect(index, cols);
    return { index, ...r };
  });
}

export const BreakoutPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [bricksRemaining, setBricksRemaining] = useState<number[]>(() =>
    Array.from({ length: BRICK_ROWS * BRICK_COLS }, (_, i) => i),
  );
  const [gameStatus, setGameStatus] = useState<
    'idle' | 'playing' | 'gameover' | 'win'
  >('idle');
  const [paddleX, setPaddleX] = useState((WIDTH - PADDLE_WIDTH) / 2);
  const ballPos = useRef({ x: WIDTH / 2, y: PADDLE_Y - BALL_RADIUS - 2 });
  const ballVel = useRef({ dx: 0, dy: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastSaveRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const bricksRef = useRef<number[]>([]);
  const paddleXRef = useRef(paddleX);
  scoreRef.current = score;
  livesRef.current = lives;
  bricksRef.current = bricksRemaining;
  paddleXRef.current = paddleX;

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'breakout');
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    setSession(s);
    sessionIdRef.current = s.id;
    setNotFound(false);
    const state = getState(s);
    setScore(state.score ?? 0);
    setLives(state.lives ?? 3);
    setBricksRemaining(state.bricksRemaining ?? []);
    if ((state.bricksRemaining?.length ?? 0) === 0 && (state.lives ?? 0) > 0) {
      setGameStatus('win');
    } else if ((state.lives ?? 0) <= 0) {
      setGameStatus('gameover');
    } else {
      setGameStatus('idle');
    }
  }, []);

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

  const persistState = useCallback(
    async (patch: {
      score?: number;
      lives?: number;
      bricksRemaining?: number[];
    }) => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        await updateSessionState(sid, patch);
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      }
    },
    [showToast],
  );

  const startPlay = useCallback(() => {
    ballPos.current = { x: WIDTH / 2, y: PADDLE_Y - BALL_RADIUS - 2 };
    ballVel.current = {
      dx: (Math.random() - 0.5) * 2 * BALL_SPEED || BALL_SPEED * 0.5,
      dy: -BALL_SPEED,
    };
    setGameStatus('playing');
  }, []);

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const loop = () => {
      const pos = ballPos.current;
      const vel = ballVel.current;
      const bricks = bricksRef.current;
      const paddleLeft = paddleXRef.current;

      pos.x += vel.dx;
      pos.y += vel.dy;

      if (pos.x - BALL_RADIUS <= 0) {
        pos.x = BALL_RADIUS;
        vel.dx = -vel.dx;
      }
      if (pos.x + BALL_RADIUS >= WIDTH) {
        pos.x = WIDTH - BALL_RADIUS;
        vel.dx = -vel.dx;
      }
      if (pos.y - BALL_RADIUS <= 0) {
        pos.y = BALL_RADIUS;
        vel.dy = -vel.dy;
      }

      const paddleRight = paddleLeft + PADDLE_WIDTH;
      if (
        pos.y + BALL_RADIUS >= PADDLE_Y &&
        pos.y - BALL_RADIUS <= PADDLE_Y + PADDLE_HEIGHT &&
        pos.x >= paddleLeft - BALL_RADIUS &&
        pos.x <= paddleRight + BALL_RADIUS
      ) {
        pos.y = PADDLE_Y - BALL_RADIUS - 1;
        vel.dy = -Math.abs(vel.dy);
        const hitPos = (pos.x - paddleLeft) / PADDLE_WIDTH;
        vel.dx = (hitPos - 0.5) * 4;
      }

      const rects = getBrickRects(bricks, BRICK_COLS);
      for (const r of rects) {
        if (
          pos.x + BALL_RADIUS >= r.x &&
          pos.x - BALL_RADIUS <= r.x + r.w &&
          pos.y + BALL_RADIUS >= r.y &&
          pos.y - BALL_RADIUS <= r.y + r.h
        ) {
          const nextBricks = bricks.filter((i) => i !== r.index);
          bricksRef.current = nextBricks;
          const newScore = scoreRef.current + POINTS_PER_BRICK;
          scoreRef.current = newScore;
          setBricksRemaining(nextBricks);
          setScore(newScore);
          vel.dy = -vel.dy;
          if (Date.now() - lastSaveRef.current > 500) {
            lastSaveRef.current = Date.now();
            void persistState({ score: newScore, bricksRemaining: nextBricks });
          }
          if (nextBricks.length === 0) {
            rafRef.current = null;
            setGameStatus('win');
            void persistState({ score: newScore, bricksRemaining: nextBricks });
            void completeSession(sessionIdRef.current!, 'solved', {
              score: newScore,
            });
          }
          break;
        }
      }

      if (pos.y - BALL_RADIUS > HEIGHT) {
        const nextLives = livesRef.current - 1;
        livesRef.current = nextLives;
        setLives(nextLives);
        void persistState({
          lives: nextLives,
          score: scoreRef.current,
          bricksRemaining: bricksRef.current,
        });
        rafRef.current = null;
        if (nextLives <= 0) {
          setGameStatus('gameover');
          void completeSession(sessionIdRef.current!, 'failed', {
            score: scoreRef.current,
          });
        } else {
          ballPos.current = { x: WIDTH / 2, y: PADDLE_Y - BALL_RADIUS - 2 };
          ballVel.current = { dx: 0, dy: 0 };
          setGameStatus('idle');
        }
        return;
      }

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#16213e';
      getBrickRects(bricksRef.current, BRICK_COLS).forEach((r) => {
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#0f3460';
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      });
      ctx.fillStyle = '#e94560';
      ctx.fillRect(paddleXRef.current, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillStyle = '#eee';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [gameStatus, persistState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (
      gameStatus === 'idle' ||
      gameStatus === 'gameover' ||
      gameStatus === 'win'
    ) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#16213e';
      getBrickRects(bricksRemaining, BRICK_COLS).forEach((r) => {
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#0f3460';
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      });
      ctx.fillStyle = '#e94560';
      ctx.fillRect(paddleX, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillStyle = '#eee';
      ctx.beginPath();
      ctx.arc(
        ballPos.current.x,
        ballPos.current.y,
        BALL_RADIUS,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      return;
    }
  }, [gameStatus, bricksRemaining, paddleX]);

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      setPaddleX(
        Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2)),
      );
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const x = (t.clientX - rect.left) * scaleX;
      setPaddleX(
        Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2)),
      );
    };
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleTouch);
    };
  }, [gameStatus]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStatus !== 'playing') return;
      const step = 20;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPaddleX((x) => Math.max(0, x - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPaddleX((x) => Math.min(WIDTH - PADDLE_WIDTH, x + step));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameStatus]);

  const handleStartNew = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createBreakoutSession();
      navigate(`/dashboard/games/breakout/${newSession.id}`, { replace: true });
      setSession(newSession);
      sessionIdRef.current = newSession.id;
      const state = getState(newSession);
      setScore(state.score ?? 0);
      setLives(state.lives ?? 3);
      setBricksRemaining(state.bricksRemaining ?? []);
      setGameStatus('idle');
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStartingNew(false);
    }
  }, [navigate, showToast]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress aria-label="Loading game" />
      </Box>
    );
  }

  if (notFound || (!session && sessionId)) {
    return (
      <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
        <Button
          component={RouterLink}
          to="/dashboard/games"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
        >
          Back to Games
        </Button>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Game not found.
        </Typography>
        <Button
          component={RouterLink}
          to="/dashboard/games"
          variant="contained"
        >
          Back to Games
        </Button>
      </Box>
    );
  }

  if (!sessionId && !session) {
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
            Breakout
          </Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 360 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Use the paddle to bounce the ball and break all bricks. Don&apos;t
            let the ball fall. You have 3 lives.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<ReplayIcon />}
            disabled={startingNew}
            onClick={() => void handleStartNew()}
            aria-label="Start new Breakout game"
          >
            {startingNew ? 'Starting…' : 'Start new game'}
          </Button>
        </Paper>
      </Box>
    );
  }

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
            Breakout
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Score: {score} · Lives: {lives}
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 1, display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          aria-label="Breakout game area"
        />
        {gameStatus === 'idle' && (
          <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Move paddle with mouse or arrow keys. Click to serve.
            </Typography>
            <Button variant="contained" onClick={startPlay}>
              Serve
            </Button>
          </Stack>
        )}
        {(gameStatus === 'gameover' || gameStatus === 'win') && (
          <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
            <Typography variant="h6">
              {gameStatus === 'win' ? 'You cleared all bricks!' : 'Game over'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Final score: {score}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                component={RouterLink}
                to="/dashboard/games"
                variant="outlined"
              >
                Back to Games
              </Button>
              <Button
                variant="contained"
                startIcon={<ReplayIcon />}
                onClick={() => void handleStartNew()}
                disabled={startingNew}
              >
                Play again
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

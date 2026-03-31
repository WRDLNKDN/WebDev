/**
 * Pool: solo arcade billiards. Aim by dragging from the cue ball and sink all
 * colored balls to clear the table.
 */
import ReplayIcon from '@mui/icons-material/Replay';
import { Box, Button, Paper, Slider, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  completeSession,
  createPoolSession,
  fetchSessionForGameType,
  updateSessionState,
  type PoolBallState,
  type PoolStatePayload,
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

const TABLE_WIDTH = 720;
const TABLE_HEIGHT = 420;
const BALL_RADIUS = 12;
const POCKET_RADIUS = 26;
const DRAG_MAX = 160;
const MAX_SPEED = 15;
const FRICTION = 0.986;
const MIN_VELOCITY = 0.08;
const CUE_START = { x: 170, y: TABLE_HEIGHT / 2 };
const BALL_COLORS = [
  '#f4c542',
  '#d9485f',
  '#3d7be0',
  '#7b56d8',
  '#f78c2b',
  '#22a06b',
];

type BallRuntimeState = PoolBallState & { vx: number; vy: number };

type PointerPoint = { x: number; y: number };

const POCKETS = [
  { x: 18, y: 18 },
  { x: TABLE_WIDTH / 2, y: 12 },
  { x: TABLE_WIDTH - 18, y: 18 },
  { x: 18, y: TABLE_HEIGHT - 18 },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - 12 },
  { x: TABLE_WIDTH - 18, y: TABLE_HEIGHT - 18 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function magnitude(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function normalize(
  x: number,
  y: number,
): { x: number; y: number; mag: number } {
  const mag = magnitude(x, y);
  if (mag <= 0) return { x: 0, y: 0, mag: 0 };
  return { x: x / mag, y: y / mag, mag };
}

function toRuntime(ball: PoolBallState): BallRuntimeState {
  return { ...ball, vx: 0, vy: 0 };
}

function getDefaultRack(): PoolBallState[] {
  const startX = 490;
  const startY = TABLE_HEIGHT / 2;
  const spacing = BALL_RADIUS * 2 + 2;
  return [
    { id: 'one', x: startX, y: startY, pocketed: false },
    {
      id: 'two',
      x: startX + spacing,
      y: startY - BALL_RADIUS - 1,
      pocketed: false,
    },
    {
      id: 'three',
      x: startX + spacing,
      y: startY + BALL_RADIUS + 1,
      pocketed: false,
    },
    {
      id: 'four',
      x: startX + spacing * 2,
      y: startY - spacing,
      pocketed: false,
    },
    { id: 'five', x: startX + spacing * 2, y: startY, pocketed: false },
    {
      id: 'six',
      x: startX + spacing * 2,
      y: startY + spacing,
      pocketed: false,
    },
  ];
}

function getState(session: GameSession): Required<PoolStatePayload> {
  const raw = session.state_payload as PoolStatePayload | undefined;
  const cueBall = raw?.cueBall;
  const balls = Array.isArray(raw?.balls) ? raw.balls : getDefaultRack();
  return {
    shots: typeof raw?.shots === 'number' ? raw.shots : 0,
    sunk: typeof raw?.sunk === 'number' ? raw.sunk : 0,
    cueBall:
      cueBall && typeof cueBall.x === 'number' && typeof cueBall.y === 'number'
        ? cueBall
        : CUE_START,
    balls,
    status:
      raw?.status === 'won'
        ? 'won'
        : raw?.status === 'shooting'
          ? 'shooting'
          : 'aiming',
  };
}

function getCanvasPoint(
  event: React.PointerEvent<HTMLCanvasElement>,
): PointerPoint | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const scaleX = TABLE_WIDTH / rect.width;
  const scaleY = TABLE_HEIGHT / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export const PoolPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [shotPower, setShotPower] = useState(72);
  const [shots, setShots] = useState(0);
  const [sunk, setSunk] = useState(0);
  const [gameStatus, setGameStatus] = useState<'aiming' | 'shooting' | 'won'>(
    'aiming',
  );
  const [isDragging, setIsDragging] = useState(false);
  const [aimPoint, setAimPoint] = useState<PointerPoint | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const cueBallRef = useRef({ x: CUE_START.x, y: CUE_START.y, vx: 0, vy: 0 });
  const ballsRef = useRef<BallRuntimeState[]>(getDefaultRack().map(toRuntime));
  const sessionIdRef = useRef<string | null>(null);
  const shotsRef = useRef(0);
  const sunkRef = useRef(0);
  const statusRef = useRef<'aiming' | 'shooting' | 'won'>('aiming');
  const completedRef = useRef(false);

  const remainingBalls = ballsRef.current.filter(
    (ball) => !ball.pocketed,
  ).length;

  const drawTable = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    const felt = ctx.createLinearGradient(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    felt.addColorStop(0, '#0d7f52');
    felt.addColorStop(1, '#08563d');
    ctx.fillStyle = felt;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    ctx.fillStyle = '#5b341c';
    ctx.fillRect(0, 0, TABLE_WIDTH, 16);
    ctx.fillRect(0, TABLE_HEIGHT - 16, TABLE_WIDTH, 16);
    ctx.fillRect(0, 0, 16, TABLE_HEIGHT);
    ctx.fillRect(TABLE_WIDTH - 16, 0, 16, TABLE_HEIGHT);

    POCKETS.forEach((pocket) => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#101010';
      ctx.fill();
    });

    const cue = cueBallRef.current;
    ctx.beginPath();
    ctx.arc(cue.x, cue.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f4ee';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ballsRef.current.forEach((ball, index) => {
      if (ball.pocketed) return;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = BALL_COLORS[index % BALL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), ball.x, ball.y);
    });

    if (isDragging && aimPoint && statusRef.current === 'aiming') {
      const dx = cue.x - aimPoint.x;
      const dy = cue.y - aimPoint.y;
      const { x: nx, y: ny, mag } = normalize(dx, dy);
      const length = clamp(mag, 0, DRAG_MAX);
      ctx.beginPath();
      ctx.moveTo(cue.x, cue.y);
      ctx.lineTo(cue.x + nx * length, cue.y + ny * length);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [aimPoint, isDragging]);

  const persistCurrentState = useCallback(
    async (nextStatus?: 'aiming' | 'shooting' | 'won') => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      const balls = ballsRef.current.map(({ id, x, y, pocketed }) => ({
        id,
        x,
        y,
        pocketed,
      }));
      try {
        await updateSessionState(sid, {
          shots: shotsRef.current,
          sunk: sunkRef.current,
          cueBall: { x: cueBallRef.current.x, y: cueBallRef.current.y },
          balls,
          status: nextStatus ?? statusRef.current,
        });
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      }
    },
    [showToast],
  );

  const loadSession = useCallback(
    async (id: string) => {
      const loaded = await fetchSessionForGameType(id, 'pool');
      if (!loaded) {
        setNotFound(true);
        return;
      }
      const state = getState(loaded);
      setNotFound(false);
      sessionIdRef.current = loaded.id;
      cueBallRef.current = {
        x: state.cueBall.x,
        y: state.cueBall.y,
        vx: 0,
        vy: 0,
      };
      ballsRef.current = state.balls.map(toRuntime);
      shotsRef.current = state.shots;
      sunkRef.current = state.sunk;
      statusRef.current = state.status;
      completedRef.current =
        state.status === 'won' || loaded.status === 'completed';
      setShots(state.shots);
      setSunk(state.sunk);
      setGameStatus(
        state.status === 'won' || loaded.status === 'completed'
          ? 'won'
          : 'aiming',
      );
      setIsDragging(false);
      setAimPoint(null);
      drawTable();
    },
    [drawTable],
  );

  useEffect(() => {
    if (!sessionId?.trim()) {
      setLoading(false);
      sessionIdRef.current = null;
      return;
    }
    setLoading(true);
    void loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  useEffect(() => {
    drawTable();
  }, [drawTable, shots, sunk, gameStatus, sessionId]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  const settleGame = useCallback(async () => {
    const remaining = ballsRef.current.filter((ball) => !ball.pocketed).length;
    if (remaining === 0) {
      statusRef.current = 'won';
      setGameStatus('won');
      if (!completedRef.current && sessionIdRef.current) {
        completedRef.current = true;
        await persistCurrentState('won');
        await completeSession(sessionIdRef.current, 'solved', {
          shots: shotsRef.current,
          sunk: sunkRef.current,
          status: 'won',
        });
      }
      return;
    }
    statusRef.current = 'aiming';
    setGameStatus('aiming');
    await persistCurrentState('aiming');
  }, [persistCurrentState]);

  const animateShot = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    const step = () => {
      const cue = cueBallRef.current;
      const activeBalls = ballsRef.current;

      cue.x += cue.vx;
      cue.y += cue.vy;
      cue.vx *= FRICTION;
      cue.vy *= FRICTION;

      activeBalls.forEach((ball) => {
        if (ball.pocketed) return;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
      });

      const allBalls = [cue, ...activeBalls.filter((ball) => !ball.pocketed)];
      allBalls.forEach((ball) => {
        if (ball.x <= 16 + BALL_RADIUS) {
          ball.x = 16 + BALL_RADIUS;
          ball.vx = Math.abs(ball.vx);
        }
        if (ball.x >= TABLE_WIDTH - 16 - BALL_RADIUS) {
          ball.x = TABLE_WIDTH - 16 - BALL_RADIUS;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y <= 16 + BALL_RADIUS) {
          ball.y = 16 + BALL_RADIUS;
          ball.vy = Math.abs(ball.vy);
        }
        if (ball.y >= TABLE_HEIGHT - 16 - BALL_RADIUS) {
          ball.y = TABLE_HEIGHT - 16 - BALL_RADIUS;
          ball.vy = -Math.abs(ball.vy);
        }
      });

      for (let i = 0; i < activeBalls.length; i += 1) {
        const ball = activeBalls[i];
        if (ball.pocketed) continue;

        const cueDx = ball.x - cue.x;
        const cueDy = ball.y - cue.y;
        const cueDist = magnitude(cueDx, cueDy);
        if (cueDist > 0 && cueDist < BALL_RADIUS * 2) {
          const overlap = BALL_RADIUS * 2 - cueDist;
          const nx = cueDx / cueDist;
          const ny = cueDy / cueDist;
          cue.x -= nx * (overlap / 2);
          cue.y -= ny * (overlap / 2);
          ball.x += nx * (overlap / 2);
          ball.y += ny * (overlap / 2);
          const dvx = cue.vx - ball.vx;
          const dvy = cue.vy - ball.vy;
          const impact = dvx * nx + dvy * ny;
          if (impact < 0) {
            cue.vx -= impact * nx;
            cue.vy -= impact * ny;
            ball.vx += impact * nx;
            ball.vy += impact * ny;
          }
        }

        for (let j = i + 1; j < activeBalls.length; j += 1) {
          const other = activeBalls[j];
          if (other.pocketed) continue;
          const dx = other.x - ball.x;
          const dy = other.y - ball.y;
          const dist = magnitude(dx, dy);
          if (dist <= 0 || dist >= BALL_RADIUS * 2) continue;
          const overlap = BALL_RADIUS * 2 - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x -= nx * (overlap / 2);
          ball.y -= ny * (overlap / 2);
          other.x += nx * (overlap / 2);
          other.y += ny * (overlap / 2);
          const dvx = ball.vx - other.vx;
          const dvy = ball.vy - other.vy;
          const impact = dvx * nx + dvy * ny;
          if (impact < 0) {
            ball.vx -= impact * nx;
            ball.vy -= impact * ny;
            other.vx += impact * nx;
            other.vy += impact * ny;
          }
        }
      }

      let sunkNow = 0;
      activeBalls.forEach((ball) => {
        if (ball.pocketed) return;
        const pocketed = POCKETS.some(
          (pocket) =>
            magnitude(ball.x - pocket.x, ball.y - pocket.y) <=
            POCKET_RADIUS - 2,
        );
        if (pocketed) {
          ball.pocketed = true;
          ball.vx = 0;
          ball.vy = 0;
          sunkNow += 1;
        }
      });
      if (sunkNow > 0) {
        sunkRef.current += sunkNow;
        setSunk(sunkRef.current);
      }

      const cuePocketed = POCKETS.some(
        (pocket) =>
          magnitude(cue.x - pocket.x, cue.y - pocket.y) <= POCKET_RADIUS - 2,
      );
      if (cuePocketed) {
        cue.x = CUE_START.x;
        cue.y = CUE_START.y;
        cue.vx = 0;
        cue.vy = 0;
      }

      drawTable();

      const moving =
        magnitude(cue.vx, cue.vy) > MIN_VELOCITY ||
        activeBalls.some(
          (ball) =>
            !ball.pocketed && magnitude(ball.vx, ball.vy) > MIN_VELOCITY,
        );

      if (moving) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      cue.vx = 0;
      cue.vy = 0;
      activeBalls.forEach((ball) => {
        ball.vx = 0;
        ball.vy = 0;
      });
      frameRef.current = null;
      void settleGame();
    };

    frameRef.current = requestAnimationFrame(step);
  }, [drawTable, settleGame]);

  const fireShot = useCallback(() => {
    if (statusRef.current !== 'aiming' || !aimPoint) return;
    const cue = cueBallRef.current;
    const dx = cue.x - aimPoint.x;
    const dy = cue.y - aimPoint.y;
    const normalized = normalize(dx, dy);
    if (normalized.mag < 8) return;
    const pull = clamp(normalized.mag, 0, DRAG_MAX) / DRAG_MAX;
    const speed = (shotPower / 100) * MAX_SPEED * (0.45 + pull * 0.55);
    cue.vx = normalized.x * speed;
    cue.vy = normalized.y * speed;
    shotsRef.current += 1;
    setShots(shotsRef.current);
    statusRef.current = 'shooting';
    setGameStatus('shooting');
    setIsDragging(false);
    setAimPoint(null);
    void persistCurrentState('shooting');
    animateShot();
  }, [aimPoint, animateShot, persistCurrentState, shotPower]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (gameStatus !== 'aiming') return;
      const point = getCanvasPoint(event);
      if (!point) return;
      const cue = cueBallRef.current;
      if (magnitude(point.x - cue.x, point.y - cue.y) > 36) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      setAimPoint(point);
    },
    [gameStatus],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging || gameStatus !== 'aiming') return;
      const point = getCanvasPoint(event);
      if (!point) return;
      setAimPoint(point);
    },
    [gameStatus, isDragging],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      fireShot();
    },
    [fireShot, isDragging],
  );

  const handleStartNew = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createPoolSession();
      navigate(`/dashboard/games/pool/${newSession.id}`, { replace: true });
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
        title="Pool"
        description="Drag from the cue ball to line up your shot, then sink all six object balls. Built for quick, touch-friendly play."
        startingNew={startingNew}
        onStartNew={() => {
          void handleStartNew();
        }}
        startAriaLabel="Start Pool game"
        startButtonLabel="Rack the table"
      />
    );
  }

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Pool"
        showStats
        stats={
          <Stack direction="row" spacing={1.5} sx={{ color: 'text.secondary' }}>
            <Typography variant="body2">Shots: {shots}</Typography>
            <Typography variant="body2">Sunk: {sunk}</Typography>
            <Typography variant="body2">Left: {remainingBalls}</Typography>
          </Stack>
        }
      />

      {gameStatus === 'won' && (
        <MiniGameGameOverPanel
          summary={`You cleared the table in ${shots} shot${shots === 1 ? '' : 's'}.`}
          startingNew={startingNew}
          onPlayAgain={() => {
            void handleStartNew();
          }}
        />
      )}

      <Stack spacing={2} sx={{ maxWidth: 860 }}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.25, sm: 2 },
            borderRadius: 3,
            background:
              'linear-gradient(180deg, rgba(13,127,82,0.08) 0%, rgba(8,86,61,0.02) 100%)',
          }}
        >
          <Box
            component="canvas"
            ref={canvasRef}
            width={TABLE_WIDTH}
            height={TABLE_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 2,
              touchAction: 'none',
              cursor: gameStatus === 'aiming' ? 'crosshair' : 'default',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            }}
            aria-label="Pool table"
          />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Shot power
            </Typography>
            <Slider
              value={shotPower}
              min={35}
              max={100}
              step={1}
              onChange={(_, value) => {
                if (typeof value === 'number') setShotPower(value);
              }}
              disabled={gameStatus !== 'aiming'}
              aria-label="Shot power"
            />
            <Typography variant="body2" color="text.secondary">
              {gameStatus === 'aiming'
                ? 'Touch or click the cue ball, drag backward to aim, then release to shoot.'
                : gameStatus === 'shooting'
                  ? 'Balls are still moving. Line up the next shot when the table settles.'
                  : 'Table cleared.'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<ReplayIcon />}
                onClick={() => {
                  void handleStartNew();
                }}
                disabled={startingNew}
              >
                {startingNew ? 'Racking…' : 'New rack'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </MiniGamePlayPageRoot>
  );
};

/**
 * Solo maze arcade game: navigate a maze collecting items while avoiding enemies.
 * Power items give a temporary advantage. Score from items; game ends when lives run out.
 */
import { Box, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  completeSession,
  createMazeChaseSession,
  fetchSessionForGameType,
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

const ROWS = 19;
const COLS = 17;
const CELL_PX = 18;
const PLAYER_MS = 140;
const GHOST_MS = 180;
const POWER_SEC = 8;
const SCORE_DOT = 10;
const SCORE_POWER = 50;
const SCORE_GHOST = 200;
const INITIAL_LIVES = 3;

// Cell: 0 = empty, 1 = wall, 2 = dot, 3 = power pellet (o)
const MAZE_TEMPLATE = [
  '#################',
  '#.......#.......#',
  '#.###.#.#.#.###.#',
  '#.......#.......#',
  '#.##.#.....#.##.#',
  '#....#.....#....#',
  '###.####.####.###',
  '  #.#........#.#  ',
  '###.#.##.##.#.###',
  '#.....#.....#....#',
  '#.####.#.####.#.#',
  '#.......#.......#',
  '#.##.#.o...#.##.#',
  '#....#.....#....#',
  '###.####.####.###',
  '#.......#.......#',
  '#.##.#.o...#.##.#',
  '#....#.....#....#',
  '#################',
];

function buildMaze(): number[][] {
  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 1),
  );
  for (let r = 0; r < MAZE_TEMPLATE.length && r < ROWS; r++) {
    const line = MAZE_TEMPLATE[r];
    for (let c = 0; c < COLS && c < (line?.length ?? 0); c++) {
      const ch = line[c];
      if (ch === ' ') grid[r][c] = 0;
      else if (ch === '.') grid[r][c] = 2;
      else if (ch === 'o') grid[r][c] = 3;
      else grid[r][c] = 1;
    }
  }
  return grid;
}

const PLAYER_START: [number, number] = [ROWS - 2, Math.floor(COLS / 2)];
const GHOST_STARTS: [number, number][] = [
  [9, 3],
  [9, 8],
  [9, 12],
];

type Dir = 'up' | 'down' | 'left' | 'right';
const DELTA: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

function add([r, c]: [number, number], d: Dir): [number, number] {
  const [dr, dc] = DELTA[d];
  return [r + dr, c + dc];
}

function canWalk(maze: number[][], r: number, c: number): boolean {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return maze[r][c] !== 1;
}

type MazeChaseSnapshot = {
  maze?: number[][];
  player?: [number, number];
  playerDir?: Dir;
  ghosts?: [number, number][];
  score?: number;
  lives?: number;
  powerRemainingMs?: number;
  status?: 'idle' | 'playing' | 'gameover';
};

function getPersistedMazeState(session: GameSession): MazeChaseSnapshot {
  const raw = session.state_payload as MazeChaseSnapshot | undefined;
  return {
    maze: Array.isArray(raw?.maze) ? raw.maze : undefined,
    player:
      Array.isArray(raw?.player) &&
      raw.player.length === 2 &&
      typeof raw.player[0] === 'number' &&
      typeof raw.player[1] === 'number'
        ? raw.player
        : undefined,
    playerDir:
      raw?.playerDir === 'up' ||
      raw?.playerDir === 'down' ||
      raw?.playerDir === 'left' ||
      raw?.playerDir === 'right'
        ? raw.playerDir
        : undefined,
    ghosts: Array.isArray(raw?.ghosts) ? raw.ghosts : undefined,
    score: typeof raw?.score === 'number' ? raw.score : undefined,
    lives: typeof raw?.lives === 'number' ? raw.lives : undefined,
    powerRemainingMs:
      typeof raw?.powerRemainingMs === 'number'
        ? raw.powerRemainingMs
        : undefined,
    status:
      raw?.status === 'idle' ||
      raw?.status === 'playing' ||
      raw?.status === 'gameover'
        ? raw.status
        : undefined,
  };
}

export const MazeChasePlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const [status, setStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [maze, setMaze] = useState<number[][]>(() => buildMaze());
  const [player, setPlayer] = useState<[number, number]>(PLAYER_START);
  const [playerDir, setPlayerDir] = useState<Dir>('up');
  const [ghosts, setGhosts] = useState<[number, number][]>(() =>
    GHOST_STARTS.map((p) => [...p] as [number, number]),
  );
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [powerRemainingMs, setPowerRemainingMs] = useState(0);

  const sessionIdRef = useRef<string | null>(null);
  const mazeRef = useRef(maze);
  const playerRef = useRef(player);
  const playerDirRef = useRef(playerDir);
  const ghostsRef = useRef(ghosts);
  const powerRemainingMsRef = useRef(0);
  const playerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ghostIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const powerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPersistAtRef = useRef(0);
  mazeRef.current = maze;
  playerRef.current = player;
  playerDirRef.current = playerDir;
  ghostsRef.current = ghosts;
  powerRemainingMsRef.current = powerRemainingMs;

  const persistMazeState = useCallback(
    async (patch?: Partial<MazeChaseSnapshot>) => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        await updateSessionState(sid, {
          maze: mazeRef.current,
          player: playerRef.current,
          playerDir: playerDirRef.current,
          ghosts: ghostsRef.current,
          score: scoreRef.current,
          lives,
          powerRemainingMs: powerRemainingMsRef.current,
          status: status === 'gameover' ? 'gameover' : 'playing',
          ...patch,
        });
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      }
    },
    [lives, showToast, status],
  );

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'maze_chase');
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    setSession(s);
    sessionIdRef.current = s.id;
    setNotFound(false);
    const persisted = getPersistedMazeState(s);
    if (persisted.maze && persisted.player && persisted.ghosts) {
      const restoredMaze = persisted.maze.map((row) => [...row]);
      const restoredPlayer: [number, number] = [
        persisted.player[0],
        persisted.player[1],
      ];
      const restoredGhosts = persisted.ghosts.map(
        ([r, c]) => [r, c] as [number, number],
      );
      const restoredDirection = persisted.playerDir ?? 'up';
      const restoredScore = persisted.score ?? 0;
      const restoredLives = persisted.lives ?? INITIAL_LIVES;
      const restoredPower = persisted.powerRemainingMs ?? 0;
      const restoredStatus =
        s.status === 'completed' ? 'gameover' : (persisted.status ?? 'playing');
      setMaze(restoredMaze);
      setPlayer(restoredPlayer);
      setPlayerDir(restoredDirection);
      setGhosts(restoredGhosts);
      setScore(restoredScore);
      setLives(restoredLives);
      setPowerRemainingMs(restoredPower);
      setStatus(restoredStatus);
      mazeRef.current = restoredMaze;
      playerRef.current = restoredPlayer;
      playerDirRef.current = restoredDirection;
      ghostsRef.current = restoredGhosts;
      scoreRef.current = restoredScore;
      powerRemainingMsRef.current = restoredPower;
      return;
    }
    const freshMaze = buildMaze();
    const freshGhosts = GHOST_STARTS.map((p) => [...p] as [number, number]);
    setMaze(freshMaze);
    setPlayer(PLAYER_START);
    setPlayerDir('up');
    setGhosts(freshGhosts);
    setScore(0);
    setLives(INITIAL_LIVES);
    setPowerRemainingMs(0);
    setStatus('playing');
    mazeRef.current = freshMaze;
    playerRef.current = PLAYER_START;
    playerDirRef.current = 'up';
    ghostsRef.current = freshGhosts;
    scoreRef.current = 0;
    powerRemainingMsRef.current = 0;
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

  const loseLife = useCallback(() => {
    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        if (playerIntervalRef.current) clearInterval(playerIntervalRef.current);
        if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);
        if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
        setStatus('gameover');
        void persistMazeState({ lives: 0, status: 'gameover' });
        recordScoreAndEnd(scoreRef.current);
        return 0;
      }
      setPlayer(PLAYER_START);
      setPlayerDir('up');
      setGhosts(GHOST_STARTS.map((p) => [...p] as [number, number]));
      setPowerRemainingMs(0);
      powerRemainingMsRef.current = 0;
      playerRef.current = PLAYER_START;
      playerDirRef.current = 'up';
      ghostsRef.current = GHOST_STARTS.map((p) => [...p] as [number, number]);
      void persistMazeState({
        player: PLAYER_START,
        playerDir: 'up',
        ghosts: GHOST_STARTS.map((p) => [...p] as [number, number]),
        lives: next,
        powerRemainingMs: 0,
      });
      return next;
    });
  }, [persistMazeState, recordScoreAndEnd]);

  const scoreRef = useRef(score);
  scoreRef.current = score;

  useEffect(() => {
    if (status !== 'playing') return;

    const tickPlayer = () => {
      const m = mazeRef.current;
      const pos = playerRef.current;
      const dir = playerDirRef.current;
      const next = add(pos, dir);
      if (!canWalk(m, next[0], next[1])) return;
      const cell = m[next[0]][next[1]];
      setMaze((prev) => {
        const nextMaze = prev.map((row) => [...row]);
        if (cell === 2) {
          nextMaze[next[0]][next[1]] = 0;
          setScore((s) => {
            scoreRef.current = s + SCORE_DOT;
            return s + SCORE_DOT;
          });
        } else if (cell === 3) {
          nextMaze[next[0]][next[1]] = 0;
          setScore((s) => {
            scoreRef.current = s + SCORE_POWER;
            return s + SCORE_POWER;
          });
          setPowerRemainingMs(POWER_SEC * 1000);
          powerRemainingMsRef.current = POWER_SEC * 1000;
        }
        mazeRef.current = nextMaze;
        return nextMaze;
      });
      setPlayer(next);
      playerRef.current = next;
      if (Date.now() - lastPersistAtRef.current >= 900) {
        lastPersistAtRef.current = Date.now();
        void persistMazeState({ player: next });
      }

      const ghostsNow = ghostsRef.current;
      const powerActive = powerRemainingMsRef.current > 0;
      for (let i = 0; i < ghostsNow.length; i++) {
        if (next[0] === ghostsNow[i][0] && next[1] === ghostsNow[i][1]) {
          if (powerActive) {
            setScore((s) => {
              scoreRef.current = s + SCORE_GHOST;
              return s + SCORE_GHOST;
            });
            setGhosts((prev) => {
              const out = prev.map((g, j) =>
                j === i ? (GHOST_STARTS[0].slice() as [number, number]) : g,
              );
              ghostsRef.current = out.map((g) => [...g] as [number, number]);
              return out;
            });
          } else {
            loseLife();
            return;
          }
        }
      }
    };

    playerIntervalRef.current = setInterval(tickPlayer, PLAYER_MS);
    return () => {
      if (playerIntervalRef.current) clearInterval(playerIntervalRef.current);
      playerIntervalRef.current = null;
    };
  }, [loseLife, persistMazeState, status]);

  useEffect(() => {
    if (status !== 'playing') return;

    const tickGhosts = () => {
      const m = mazeRef.current;
      const ply = playerRef.current;
      const powerActive = powerRemainingMsRef.current > 0;
      setGhosts((prev) => {
        const next = prev.map(([gr, gc]): [number, number] => {
          const choices: Dir[] = [];
          for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
            const [nr, nc] = add([gr, gc], d);
            if (canWalk(m, nr, nc)) choices.push(d);
          }
          if (choices.length === 0) return [gr, gc];
          let best: Dir = choices[0];
          if (powerActive) {
            let maxDist = -1;
            for (const d of choices) {
              const [nr, nc] = add([gr, gc], d);
              const dist = Math.abs(nr - ply[0]) + Math.abs(nc - ply[1]);
              if (dist > maxDist) {
                maxDist = dist;
                best = d;
              }
            }
          } else {
            let minDist = 1e9;
            for (const d of choices) {
              const [nr, nc] = add([gr, gc], d);
              const dist = Math.abs(nr - ply[0]) + Math.abs(nc - ply[1]);
              if (dist < minDist) {
                minDist = dist;
                best = d;
              }
            }
          }
          const [nr, nc] = add([gr, gc], best);
          return [nr, nc];
        });
        ghostsRef.current = next.map((g) => [...g] as [number, number]);
        if (Date.now() - lastPersistAtRef.current >= 900) {
          lastPersistAtRef.current = Date.now();
          void persistMazeState({ ghosts: ghostsRef.current });
        }
        return next;
      });

      const playerPos = playerRef.current;
      const gs = ghostsRef.current;
      for (const g of gs) {
        if (playerPos[0] === g[0] && playerPos[1] === g[1]) {
          if (powerRemainingMsRef.current > 0) {
            setScore((s) => {
              scoreRef.current = s + SCORE_GHOST;
              return s + SCORE_GHOST;
            });
            setGhosts((prev) => {
              const idx = prev.findIndex((x) => x[0] === g[0] && x[1] === g[1]);
              if (idx < 0) return prev;
              const out = prev.map((gh, j) =>
                j === idx ? (GHOST_STARTS[0].slice() as [number, number]) : gh,
              );
              ghostsRef.current = out.map((x) => [...x] as [number, number]);
              return out;
            });
          } else {
            loseLife();
          }
          break;
        }
      }
    };

    ghostIntervalRef.current = setInterval(tickGhosts, GHOST_MS);
    return () => {
      if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);
      ghostIntervalRef.current = null;
    };
  }, [loseLife, persistMazeState, status]);

  useEffect(() => {
    if (status !== 'playing' || powerRemainingMs <= 0) return;
    const t = setInterval(() => {
      setPowerRemainingMs((prev) => {
        const next = Math.max(0, prev - 100);
        powerRemainingMsRef.current = next;
        return next;
      });
      if (Date.now() - lastPersistAtRef.current >= 900) {
        lastPersistAtRef.current = Date.now();
        void persistMazeState({
          powerRemainingMs: powerRemainingMsRef.current,
        });
      }
    }, 100);
    powerIntervalRef.current = t;
    return () => {
      clearInterval(t);
      powerIntervalRef.current = null;
    };
  }, [persistMazeState, powerRemainingMs, status]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      let d: Dir | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          d = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          d = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          d = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          d = 'right';
          break;
        default:
          break;
      }
      if (d !== null) {
        playerDirRef.current = d;
        setPlayerDir(d);
        void persistMazeState({ playerDir: d });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [persistMazeState, status]);

  const handlePlayAgain = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createMazeChaseSession();
      navigate(`/dashboard/games/maze-chase/${newSession.id}`, {
        replace: true,
      });
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
        title="Maze Chase"
        description="Move through the maze collecting dots. Avoid enemies; collect power pellets to turn the tables. Score from items and catching enemies when powered. Game ends when lives run out."
        startingNew={startingNew}
        onStartNew={async () => {
          await handlePlayAgain();
        }}
        startAriaLabel="Start new Maze Chase game"
      />
    );
  }

  if (!session) return null;

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Maze Chase"
        showStats={status === 'playing'}
        stats={
          <Typography variant="body2" color="text.secondary">
            Score: {score} · Lives: {lives}
            {powerRemainingMs > 0 &&
              ` · Power: ${(powerRemainingMs / 1000).toFixed(1)}s`}
          </Typography>
        }
      />

      {status === 'gameover' && (
        <MiniGameGameOverPanel
          summary={`Final score: ${score}`}
          startingNew={startingNew}
          onPlayAgain={async () => {
            await handlePlayAgain();
          }}
        />
      )}

      <Paper variant="outlined" sx={{ p: 0.5, display: 'inline-block' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${CELL_PX}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL_PX}px)`,
            gap: 0,
            bgcolor: 'grey.900',
          }}
          role="img"
          aria-label="Maze"
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const cell = maze[r]?.[c] ?? 1;
            const isPlayer = player[0] === r && player[1] === c;
            const ghostHere = ghosts.some((g) => g[0] === r && g[1] === c);
            const powerActive = powerRemainingMs > 0;
            let bg = 'grey.900';
            if (cell === 1) bg = '#1a237e';
            else if (cell === 2) bg = 'transparent';
            else if (cell === 3) bg = 'transparent';
            return (
              <Box
                key={`${r}-${c}`}
                sx={{
                  width: CELL_PX,
                  height: CELL_PX,
                  bgcolor: bg,
                  border: '0px solid transparent',
                  borderRadius: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {cell === 2 && !isPlayer && !ghostHere && (
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                    }}
                  />
                )}
                {cell === 3 && !isPlayer && !ghostHere && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                    }}
                  />
                )}
                {isPlayer && (
                  <Box
                    sx={{
                      width: CELL_PX - 4,
                      height: CELL_PX - 4,
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                    }}
                  />
                )}
                {ghostHere && !isPlayer && (
                  <Box
                    sx={{
                      width: CELL_PX - 4,
                      height: CELL_PX - 4,
                      borderRadius: 1,
                      bgcolor: powerActive ? 'primary.main' : 'error.main',
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>

      {status === 'playing' && (
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 1, color: 'text.secondary' }}
        >
          Arrow keys or WASD: move. Collect yellow dots (10 pts) and blue power
          pellets (50 pts). When powered, catch ghosts (200 pts). Avoid ghosts
          otherwise—lose a life.
        </Typography>
      )}
    </MiniGamePlayPageRoot>
  );
};

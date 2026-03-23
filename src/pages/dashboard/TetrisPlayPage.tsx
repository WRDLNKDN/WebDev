/**
 * Solo Tetris-style falling block puzzle. Blocks fall from the top; rotate and place
 * to complete rows. Completed rows disappear and increase score. Speed increases over
 * time. Game ends when blocks reach the top.
 */
import { Box, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  completeSession,
  createTetrisSession,
  fetchSessionById,
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

const COLS = 10;
const ROWS = 20;
const CELL_PX = 22;
const LINES_PER_LEVEL = 10;
const INITIAL_MS = 1000;
const MIN_MS = 100;
const LEVEL_SPEED_DELTA = 80;

// Tetromino shapes: 4 rotations each, 4x4 grid. 1 = cell, 0 = empty.
// Order: I, O, T, S, Z, J, L (shapeIndex 0..6)
const SHAPES: number[][][][] = [
  [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
  ],
  [
    [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
  ],
];

const COLORS = [
  '#00bcd4', // I cyan
  '#ffeb3b', // O yellow
  '#9c27b0', // T purple
  '#4caf50', // S green
  '#f44336', // Z red
  '#2196f3', // J blue
  '#ff9800', // L orange
];

type Piece = { shapeIndex: number; rotation: number; row: number; col: number };

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 0),
  );
}

function randomPiece(): Piece {
  return {
    shapeIndex: Math.floor(Math.random() * 7),
    rotation: 0,
    row: 0,
    col: 3,
  };
}

function getShapeCells(p: Piece): [number, number][] {
  const shape = SHAPES[p.shapeIndex][p.rotation];
  const cells: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (shape[r][c]) cells.push([p.row + r, p.col + c]);
    }
  }
  return cells;
}

function collides(board: number[][], p: Piece): boolean {
  const cells = getShapeCells(p);
  for (const [r, c] of cells) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    if (board[r][c] !== 0) return true;
  }
  return false;
}

function dropIntervalMs(level: number): number {
  const ms = INITIAL_MS - (level - 1) * LEVEL_SPEED_DELTA;
  return Math.max(MIN_MS, ms);
}

// Score: 100 * level per line, 2=300, 3=500, 4=800 (× level)
function scoreForLines(lines: number, level: number): number {
  const base = lines === 1 ? 100 : lines === 2 ? 300 : lines === 3 ? 500 : 800;
  return base * level;
}

export const TetrisPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const [status, setStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [board, setBoard] = useState<number[][]>(() => createBoard());
  const [piece, setPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);

  const sessionIdRef = useRef<string | null>(null);
  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const linesClearedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  boardRef.current = board;
  pieceRef.current = piece;
  scoreRef.current = score;
  levelRef.current = level;
  linesClearedRef.current = linesCleared;

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'tetris') {
      setNotFound(true);
      setSession(null);
      return;
    }
    setSession(s);
    sessionIdRef.current = s.id;
    setNotFound(false);
    setBoard(createBoard());
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setPiece(randomPiece());
    setStatus('playing');
  }, []);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setLoading(false);
      setSession(null);
      sessionIdRef.current = null;
      return;
    }
    setLoading(true);
    void loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const recordScoreAndEnd = useCallback(
    async (finalScore: number, finalLevel: number) => {
      const sid = sessionIdRef.current;
      if (sid) {
        try {
          await completeSession(sid, 'solved', {
            score: finalScore,
            level: finalLevel,
          });
        } catch (e) {
          showToast({ message: toMessage(e), severity: 'error' });
        }
      }
    },
    [showToast],
  );

  const clearFullRows = useCallback(
    (b: number[][]): { board: number[][]; cleared: number } => {
      const full: number[] = [];
      for (let r = 0; r < ROWS; r++) {
        if (b[r].every((v) => v !== 0)) full.push(r);
      }
      if (full.length === 0) return { board: b, cleared: 0 };
      const next = b.filter((_, r) => !full.includes(r));
      const empty = Array.from({ length: full.length }, () =>
        Array.from({ length: COLS }, () => 0),
      );
      const board = [...empty, ...next];
      return { board, cleared: full.length };
    },
    [],
  );

  const lockPiece = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current.map((row) => [...row]);
    if (!p) return;
    const cells = getShapeCells(p);
    const colorIndex = p.shapeIndex + 1;
    for (const [r, c] of cells) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) b[r][c] = colorIndex;
    }
    const { board: nextBoard, cleared } = clearFullRows(b);
    const addScore = cleared > 0 ? scoreForLines(cleared, levelRef.current) : 0;
    const nextScore = scoreRef.current + addScore;
    const nextLines = linesClearedRef.current + cleared;
    const nextLevel = Math.floor(nextLines / LINES_PER_LEVEL) + 1;

    setBoard(nextBoard);
    setScore(nextScore);
    setLinesCleared(nextLines);
    setLevel(nextLevel);
    boardRef.current = nextBoard;
    scoreRef.current = nextScore;
    linesClearedRef.current = nextLines;
    levelRef.current = nextLevel;

    const nextPiece: Piece = randomPiece();
    if (collides(nextBoard, nextPiece)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setStatus('gameover');
      setPiece(null);
      void recordScoreAndEnd(nextScore, nextLevel);
      return;
    }
    setPiece(nextPiece);
    pieceRef.current = nextPiece;
  }, [clearFullRows, recordScoreAndEnd]);

  useEffect(() => {
    if (status !== 'playing') return;

    const tick = () => {
      const p = pieceRef.current;
      const b = boardRef.current;
      if (!p) return;
      const down: Piece = { ...p, row: p.row + 1 };
      if (collides(b, down)) {
        lockPiece();
        return;
      }
      setPiece(down);
      pieceRef.current = down;
    };

    const ms = dropIntervalMs(levelRef.current);
    intervalRef.current = setInterval(tick, ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [status, level, lockPiece]);

  const move = useCallback(
    (dCol: number) => {
      if (status !== 'playing' || !piece) return;
      const next: Piece = { ...piece, col: piece.col + dCol };
      if (!collides(board, next)) {
        setPiece(next);
        pieceRef.current = next;
      }
    },
    [status, piece, board],
  );

  const rotate = useCallback(() => {
    if (status !== 'playing' || !piece) return;
    const nextRot = (piece.rotation + 1) % 4;
    const next: Piece = { ...piece, rotation: nextRot };
    if (!collides(board, next)) {
      setPiece(next);
      pieceRef.current = next;
    }
  }, [status, piece, board]);

  const softDrop = useCallback(() => {
    if (status !== 'playing' || !piece) return;
    const b = boardRef.current;
    const down: Piece = { ...piece, row: piece.row + 1 };
    if (collides(b, down)) {
      lockPiece();
      return;
    }
    setPiece(down);
    pieceRef.current = down;
  }, [status, piece, lockPiece]);

  const hardDrop = useCallback(() => {
    if (status !== 'playing' || !piece) return;
    const b = boardRef.current;
    let p = piece;
    while (!collides(b, { ...p, row: p.row + 1 })) p = { ...p, row: p.row + 1 };
    setPiece(p);
    pieceRef.current = p;
    lockPiece();
  }, [status, piece, lockPiece]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          move(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          move(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          softDrop();
          break;
        case 'ArrowUp':
        case 'z':
        case 'Z':
        case 'x':
        case 'X':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status, move, rotate, softDrop, hardDrop]);

  const handlePlayAgain = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createTetrisSession();
      navigate(`/dashboard/games/tetris/${newSession.id}`, { replace: true });
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
        title="Tetris"
        description="Blocks fall from the top. Rotate and place them to complete rows. Completed rows disappear and add to your score. Speed increases over time."
        startingNew={startingNew}
        onStartNew={() => void handlePlayAgain()}
        startAriaLabel="Start new Tetris game"
      />
    );
  }

  if (!session) return null;

  const displayBoard = board.map((row) => [...row]);
  if (piece && status === 'playing') {
    const cells = getShapeCells(piece);
    const colorIndex = piece.shapeIndex + 1;
    for (const [r, c] of cells) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS)
        displayBoard[r][c] = colorIndex;
    }
  }

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Tetris"
        showStats={status === 'playing'}
        stats={
          <Typography variant="body2" color="text.secondary">
            Score: {score} · Level: {level} · Lines: {linesCleared}
          </Typography>
        }
      />

      {status === 'gameover' && (
        <MiniGameGameOverPanel
          summary={`Final score: ${score} · Level: ${level}`}
          startingNew={startingNew}
          onPlayAgain={() => void handlePlayAgain()}
        />
      )}

      <Paper variant="outlined" sx={{ p: 0.5, display: 'inline-block' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${CELL_PX}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL_PX}px)`,
            gap: 0.5,
            bgcolor: 'grey.900',
          }}
          role="img"
          aria-label="Tetris board"
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const cell = displayBoard[r]?.[c] ?? 0;
            const bg = cell > 0 ? COLORS[cell - 1] : 'transparent';
            return (
              <Box
                key={`${r}-${c}`}
                sx={{
                  width: CELL_PX,
                  height: CELL_PX,
                  bgcolor: bg,
                  border: '1px solid',
                  borderColor: cell > 0 ? 'grey.700' : 'grey.800',
                  borderRadius: 0.5,
                }}
              />
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
          Arrow keys: move · Up / Z / X: rotate · Down: soft drop · Space: hard
          drop
        </Typography>
      )}
    </MiniGamePlayPageRoot>
  );
};

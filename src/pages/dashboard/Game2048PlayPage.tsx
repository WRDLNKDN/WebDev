/**
 * 2048: solo sliding number puzzle. Combine tiles to reach 2048.
 * Tiles merge on collision; new tile spawns each move; game over when no moves remain.
 * State persists in game_sessions.state_payload.
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  completeSession,
  create2048Session,
  fetchSessionForGameType,
  spawn2048Tile,
  updateSessionState,
  type Game2048StatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';

const SIZE = 4;
type Direction = 'up' | 'down' | 'left' | 'right';

function parseBoard(session: GameSession): number[][] {
  const raw = (session.state_payload as Game2048StatePayload | undefined)
    ?.board;
  if (Array.isArray(raw) && raw.length === SIZE) {
    return raw.map((row) =>
      Array.isArray(row) && row.length === SIZE
        ? row.map((v) => (typeof v === 'number' && v >= 0 ? v : 0))
        : Array.from({ length: SIZE }, () => 0),
    );
  }
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 0),
  );
}

function getScore(session: GameSession): number {
  const s = (session.state_payload as Game2048StatePayload | undefined)?.score;
  return typeof s === 'number' && s >= 0 ? s : 0;
}

function slideLine(line: number[]): { line: number[]; scoreGain: number } {
  const filtered = line.filter((v) => v !== 0);
  const result: number[] = [];
  let scoreGain = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      result.push(filtered[i] * 2);
      scoreGain += filtered[i] * 2;
      i += 2;
    } else {
      result.push(filtered[i]);
      i += 1;
    }
  }
  while (result.length < SIZE) result.push(0);
  return { line: result, scoreGain };
}

function slideBoard(
  board: number[][],
  direction: Direction,
): { board: number[][]; scoreGain: number; changed: boolean } {
  const next = board.map((row) => [...row]);
  let scoreGain = 0;
  let changed = false;

  if (direction === 'left') {
    for (let r = 0; r < SIZE; r++) {
      const { line, scoreGain: gain } = slideLine(next[r]);
      if (JSON.stringify(line) !== JSON.stringify(next[r])) changed = true;
      next[r] = line;
      scoreGain += gain;
    }
  } else if (direction === 'right') {
    for (let r = 0; r < SIZE; r++) {
      const rev = [...next[r]].reverse();
      const { line, scoreGain: gain } = slideLine(rev);
      next[r] = line.reverse();
      scoreGain += gain;
      if (JSON.stringify(next[r]) !== JSON.stringify(board[r])) changed = true;
    }
  } else if (direction === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = next.map((row) => row[c]);
      const { line, scoreGain: gain } = slideLine(col);
      for (let r = 0; r < SIZE; r++) next[r][c] = line[r];
      scoreGain += gain;
      if (JSON.stringify(line) !== JSON.stringify(col)) changed = true;
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const origCol = next.map((row) => row[c]);
      const col = [...origCol].reverse();
      const { line, scoreGain: gain } = slideLine(col);
      const merged = line.reverse();
      for (let r = 0; r < SIZE; r++) next[r][c] = merged[r];
      scoreGain += gain;
      if (JSON.stringify(merged) !== JSON.stringify(origCol)) changed = true;
    }
  }

  return { board: next, scoreGain, changed };
}

function canMove(board: number[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      const v = board[r][c];
      if (c + 1 < SIZE && board[r][c + 1] === v) return true;
      if (r + 1 < SIZE && board[r + 1][c] === v) return true;
    }
  }
  return false;
}

const TILE_BG: Record<number, string> = {
  0: 'rgba(238,228,218,0.35)',
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

function getTileBg(value: number): string {
  return TILE_BG[value] ?? '#3c3a32';
}

export const Game2048PlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [moving, setMoving] = useState(false);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, '2048');
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
      setNotFound(false);
      setSession(null);
      return;
    }
    setLoading(true);
    void loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const board = useMemo(
    () => (session ? parseBoard(session) : ([] as number[][])),
    [session],
  );
  const score = session ? getScore(session) : 0;
  const completed = session?.status === 'completed';
  const noMoves = !canMove(board);
  const completedNoMovesRef = useRef(false);

  useEffect(() => {
    if (!session?.id || completed || !noMoves || completedNoMovesRef.current)
      return;
    completedNoMovesRef.current = true;
    void completeSession(session.id, 'failed', { board, score }).then(() => {
      void loadSession(session.id);
    });
  }, [session?.id, completed, noMoves, loadSession, board, score]);

  const handleMove = useCallback(
    async (direction: Direction) => {
      if (!session?.id || session.status === 'completed' || moving) return;
      const board = parseBoard(session);
      const {
        board: nextBoard,
        scoreGain,
        changed,
      } = slideBoard(board, direction);
      if (!changed) return;
      setMoving(true);
      const newScore = getScore(session) + scoreGain;
      spawn2048Tile(nextBoard);
      const gameOver = !canMove(nextBoard);
      try {
        await updateSessionState(session.id, {
          board: nextBoard,
          score: newScore,
        });
        if (gameOver) {
          await completeSession(session.id, 'failed', {
            board: nextBoard,
            score: newScore,
          });
        }
        await loadSession(session.id);
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setMoving(false);
      }
    },
    [session, moving, loadSession, showToast],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!session || session.status === 'completed') return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          void handleMove('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          void handleMove('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          void handleMove('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          void handleMove('down');
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session, handleMove]);

  const handleStartNew = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await create2048Session();
      navigate(`/dashboard/games/2048/${newSession.id}`, { replace: true });
      setSession(newSession);
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

  if (notFound || (!sessionId?.trim() && !session)) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            startIcon={<ArrowBackIcon />}
          >
            Games
          </Button>
        </Stack>
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {notFound
              ? 'Session not found or not a 2048 game.'
              : 'Start a 2048 game.'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => void handleStartNew()}
            disabled={startingNew}
            startIcon={<ReplayIcon />}
          >
            {startingNew ? 'Starting…' : 'New game'}
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!session) return null;

  if (completed || noMoves) {
    const won = board.some((row) => row.some((v) => v === 2048));
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            startIcon={<ArrowBackIcon />}
          >
            Games
          </Button>
        </Stack>
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {won ? 'You reached 2048!' : 'No moves left'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Final score: {score}
          </Typography>
          <Button
            variant="contained"
            startIcon={<ReplayIcon />}
            onClick={() => void handleStartNew()}
            disabled={startingNew}
          >
            Play again
          </Button>
        </Paper>
      </Box>
    );
  }

  const cellSize = 72;
  const gap = 8;

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Button
          component={RouterLink}
          to="/dashboard/games"
          startIcon={<ArrowBackIcon />}
        >
          Games
        </Button>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Score
            </Typography>
            <Typography variant="h6">{score}</Typography>
          </Paper>
          <Button
            size="small"
            startIcon={<ReplayIcon />}
            onClick={() => void handleStartNew()}
            disabled={startingNew}
          >
            New game
          </Button>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          p: `${gap}px`,
          display: 'inline-block',
          bgcolor: '#bbada0',
          borderRadius: 2,
        }}
        role="grid"
        aria-label="2048 game board"
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${SIZE}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          {board.map((row, r) =>
            row.map((value, c) => (
              <Box
                key={`${r}-${c}`}
                sx={{
                  width: cellSize,
                  height: cellSize,
                  bgcolor: getTileBg(value),
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize:
                    value <= 4 ? '1.5rem' : value <= 64 ? '1.25rem' : '1rem',
                  color: value <= 4 ? '#776e65' : '#f9f6f2',
                }}
                aria-label={value === 0 ? 'Empty' : `Tile ${value}`}
              >
                {value > 0 ? value : ''}
              </Box>
            )),
          )}
        </Box>
      </Paper>

      <Typography
        variant="caption"
        display="block"
        sx={{ mt: 2 }}
        color="text.secondary"
      >
        Use arrow keys or the buttons below to slide tiles.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
        {(['up', 'down', 'left', 'right'] as const).map((dir) => (
          <Button
            key={dir}
            variant="outlined"
            size="small"
            disabled={moving}
            onClick={() => void handleMove(dir)}
          >
            {dir.charAt(0).toUpperCase() + dir.slice(1)}
          </Button>
        ))}
      </Stack>
    </Box>
  );
};

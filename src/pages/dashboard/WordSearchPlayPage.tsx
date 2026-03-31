/**
 * Word Search: timed solo game. Find words by connecting adjacent letters;
 * only words from the approved dictionary count. Score = sum of valid word lengths.
 * State in game_sessions.state_payload; game ends when timer expires.
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
  createWordSearchSession,
  fetchSessionForGameType,
  submitWordSearchWord,
  type WordSearchStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';

function getState(session: GameSession): WordSearchStatePayload {
  const raw = session.state_payload as WordSearchStatePayload | undefined;
  const grid = Array.isArray(raw?.grid)
    ? raw.grid.map((row) =>
        Array.isArray(row)
          ? row.map((c) => (typeof c === 'string' ? c : ''))
          : [],
      )
    : [];
  return {
    grid,
    startTime:
      typeof raw?.startTime === 'string'
        ? raw.startTime
        : new Date().toISOString(),
    durationSeconds:
      typeof raw?.durationSeconds === 'number' ? raw.durationSeconds : 60,
    foundWords: Array.isArray(raw?.foundWords) ? raw.foundWords : [],
    score: typeof raw?.score === 'number' ? raw.score : 0,
  };
}

function isAdjacent(a: [number, number], b: [number, number]): boolean {
  const [r, c] = a;
  const [r2, c2] = b;
  return (
    Math.abs(r - r2) <= 1 && Math.abs(c - c2) <= 1 && (r !== r2 || c !== c2)
  );
}

function pathToWord(grid: string[][], path: [number, number][]): string {
  return path.map(([r, c]) => (grid[r]?.[c] ?? '').toLowerCase()).join('');
}

function secondsRemaining(startTime: string, durationSeconds: number): number {
  const start = new Date(startTime).getTime();
  const end = start + durationSeconds * 1000;
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 1000));
}

export const WordSearchPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [path, setPath] = useState<[number, number][]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'word_search');
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
      setTimerSeconds(null);
      return;
    }
    setLoading(true);
    loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const state = session ? getState(session) : null;
  const completed = session?.status === 'completed';

  useEffect(() => {
    if (!state || completed) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimerSeconds(completed ? 0 : null);
      return;
    }
    const tick = () => {
      const sec = secondsRemaining(state.startTime, state.durationSeconds);
      setTimerSeconds(sec);
      if (sec <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        if (session && session.status !== 'completed') {
          completeSession(session.id, 'failed').then(
            () => void loadSession(session.id),
          );
        }
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [
    state?.startTime,
    state?.durationSeconds,
    completed,
    session?.id,
    loadSession,
    session,
    state,
  ]);

  const grid = useMemo(() => state?.grid ?? [], [state]);
  const rows = grid.length;
  const cols = rows > 0 ? (grid[0]?.length ?? 0) : 0;
  const pathSet = useMemo(
    () => new Set(path.map(([r, c]) => `${r},${c}`)),
    [path],
  );

  const canClick = useCallback(
    (r: number, c: number): boolean => {
      if (completed || rows === 0 || cols === 0) return false;
      const cell: [number, number] = [r, c];
      if (path.length === 0) return true;
      const last = path[path.length - 1];
      if (last[0] === r && last[1] === c) return true;
      if (pathSet.has(`${r},${c}`)) return false;
      return isAdjacent(last, cell);
    },
    [completed, path, pathSet, rows, cols],
  );

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (!canClick(r, c)) return;
      const cell: [number, number] = [r, c];
      const last = path[path.length - 1];
      if (path.length > 0 && last[0] === r && last[1] === c) return;
      if (pathSet.has(`${r},${c}`)) {
        const idx = path.findIndex(([a, b]) => a === r && b === c);
        if (idx >= 0) setPath(path.slice(0, idx + 1));
        return;
      }
      setPath((prev) => [...prev, cell]);
    },
    [canClick, path, pathSet],
  );

  const handleSubmitWord = useCallback(async () => {
    if (!session?.id || path.length < 2 || submitting || completed) return;
    const word = pathToWord(grid, path);
    if (!word) return;
    setSubmitting(true);
    try {
      await submitWordSearchWord(session.id, word, path);
      await loadSession(session.id);
      setPath([]);
      showToast({ message: `"${word}" +${path.length}`, severity: 'success' });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [session, path, grid, submitting, completed, loadSession, showToast]);

  const handleClearPath = useCallback(() => setPath([]), []);

  const handleStartNew = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createWordSearchSession();
      navigate(`/dashboard/games/word-search/${newSession.id}`, {
        replace: true,
      });
      setSession(newSession);
      setPath([]);
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
            Word Search
          </Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 360 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Find words by connecting adjacent letters (including diagonals).
            Only words from the dictionary count. Score is the sum of valid word
            lengths. Beat the clock!
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<ReplayIcon />}
            disabled={startingNew}
            onClick={() => void handleStartNew()}
            aria-label="Start new Word Search game"
          >
            {startingNew ? 'Starting…' : 'Start new game'}
          </Button>
        </Paper>
      </Box>
    );
  }

  const currentWord = path.length >= 2 ? pathToWord(grid, path) : '';
  const timeUp = timerSeconds === 0;

  return (
    <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 3 }}
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
            Word Search
          </Typography>
        </Stack>
        {!completed && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReplayIcon />}
            disabled={startingNew}
            onClick={() => void handleStartNew()}
          >
            New game
          </Button>
        )}
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        alignItems="flex-start"
      >
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Time: {timerSeconds !== null ? `${timerSeconds}s` : '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Score: {state?.score ?? 0}
            </Typography>
          </Stack>
          <Box
            sx={{
              display: 'inline-grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 0.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 0.5,
            }}
            role="grid"
            aria-label="Letter grid"
          >
            {grid.map((row, r) =>
              row.map((letter, c) => {
                const selected = pathSet.has(`${r},${c}`);
                const indexInPath = path.findIndex(
                  ([a, b]) => a === r && b === c,
                );
                const clickable = canClick(r, c);
                return (
                  <Button
                    key={`${r}-${c}`}
                    variant={selected ? 'contained' : 'outlined'}
                    size="small"
                    disabled={!clickable || timeUp}
                    onClick={() => handleCellClick(r, c)}
                    aria-label={`Cell ${r + 1} ${c + 1}, letter ${(letter ?? '').toUpperCase()}${selected ? `, position ${indexInPath + 1} in word` : ''}`}
                    sx={{
                      minWidth: 40,
                      minHeight: 44,
                      fontWeight: 600,
                      fontSize: '1rem',
                    }}
                  >
                    {(letter ?? '').toUpperCase()}
                  </Button>
                );
              }),
            )}
          </Box>
          {path.length >= 2 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                Word: <strong>{currentWord}</strong>
              </Typography>
              <Button
                size="small"
                variant="contained"
                disabled={submitting || timeUp}
                onClick={() => void handleSubmitWord()}
              >
                Submit
              </Button>
              <Button size="small" variant="outlined" onClick={handleClearPath}>
                Clear
              </Button>
            </Stack>
          )}
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 180 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Found words
          </Typography>
          {state?.foundWords && state.foundWords.length > 0 ? (
            <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
              {state.foundWords.map((w) => (
                <Typography component="li" key={w} variant="body2">
                  {w}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              None yet.
            </Typography>
          )}
        </Paper>
      </Stack>

      {(completed || timeUp) && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {completed ? 'Game over.' : 'Time is up.'} Final score:{' '}
            {state?.score ?? 0}
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
        </Paper>
      )}
    </Box>
  );
};

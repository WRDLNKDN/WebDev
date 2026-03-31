/**
 * Daily Word: one puzzle per day for all players. Guess the 5-letter word in up to 6 tries.
 * Letter hints: correct (green), present (yellow), absent (gray). Results recorded; optional share.
 */
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchSessionForGameType,
  getOrCreateDailyWordSession,
  submitDailyWordGuess,
  type DailyWordStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';
import {
  MiniGameLoadingNotFound,
  MiniGamePlayHeaderRow,
  MiniGamePlayPageRoot,
} from './games/MiniGamePlayChrome';

const ROWS = 6;
const COLS = 5;
const CELL_SIZE = 48;

const HINT_COLORS = {
  correct: '#538d4e',
  present: '#b59f3b',
  absent: '#3a3a3c',
} as const;

function getState(session: GameSession): DailyWordStatePayload {
  const raw = session.state_payload as DailyWordStatePayload | undefined;
  return {
    puzzleDate: raw?.puzzleDate,
    guesses: Array.isArray(raw?.guesses) ? raw.guesses : [],
  };
}

function shareableGrid(
  guesses: DailyWordStatePayload['guesses'],
  puzzleDate: string,
): string {
  const lines = (guesses ?? []).map((g) =>
    (g.hints ?? [])
      .map((h) => (h === 'correct' ? '🟩' : h === 'present' ? '🟨' : '⬛'))
      .join(''),
  );
  const dateStr = puzzleDate
    ? new Date(puzzleDate + 'Z').toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Daily Word';
  return `Daily Word ${dateStr}\n${lines.join('\n')}`.trim();
}

export const DailyWordPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentGuess, setCurrentGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'daily_word');
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    setSession(s);
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (sessionId?.trim()) {
      setLoading(true);
      loadSession(sessionId.trim()).finally(() => setLoading(false));
    } else {
      setLoading(true);
      getOrCreateDailyWordSession()
        .then((s) => {
          setSession(s);
          setNotFound(false);
          if (s?.id)
            navigate(`/dashboard/games/daily-word/${s.id}`, { replace: true });
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    }
  }, [sessionId, loadSession, navigate]);

  const state = session ? getState(session) : null;
  const guesses = useMemo(() => state?.guesses ?? [], [state]);
  const completed = session?.status === 'completed';
  const won = session?.result === 'solved';
  const canGuess = !completed && guesses.length < ROWS;

  const handleSubmit = useCallback(async () => {
    const word = currentGuess.trim().toLowerCase();
    if (word.length !== COLS || !session?.id) return;
    setSubmitting(true);
    try {
      await submitDailyWordGuess(session.id, word);
      await loadSession(session.id);
      setCurrentGuess('');
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [currentGuess, session, loadSession, showToast]);

  const handleKey = useCallback(
    (key: string) => {
      if (completed) return;
      if (key === 'Enter') {
        if (currentGuess.length === COLS) void handleSubmit();
        return;
      }
      if (key === 'Backspace') {
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z]$/.test(key) && currentGuess.length < COLS) {
        setCurrentGuess((prev) => (prev + key).toLowerCase().slice(0, COLS));
      }
    },
    [completed, currentGuess, handleSubmit],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
      if (['Enter', 'Backspace'].includes(e.key) || /^[a-zA-Z]$/.test(e.key))
        e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  const handleShare = useCallback(() => {
    const text = shareableGrid(guesses, state?.puzzleDate ?? '');
    void navigator.clipboard.writeText(text).then(() => {
      showToast({
        message: 'Results copied to clipboard.',
        severity: 'success',
      });
    });
  }, [guesses, state?.puzzleDate, showToast]);

  if (loading || notFound) {
    return (
      <MiniGameLoadingNotFound
        loading={loading}
        notFound={notFound}
        notFoundMessage="Puzzle not found."
        loadingAriaLabel="Loading puzzle"
      />
    );
  }

  if (!session) return null;

  const puzzleDateLabel = state?.puzzleDate
    ? new Date(state.puzzleDate + 'Z').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Daily Word"
        showStats={Boolean(puzzleDateLabel)}
        stats={
          <Typography variant="body2" color="text.secondary">
            {puzzleDateLabel}
          </Typography>
        }
      />

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 360, mx: 'auto' }}>
        <Stack spacing={2} alignItems="center">
          {Array.from({ length: ROWS }, (_, row) => (
            <Stack key={row} direction="row" spacing={0.5}>
              {Array.from({ length: COLS }, (_, col) => {
                const guessRow = guesses[row];
                const letter = guessRow
                  ? (guessRow.word[col] ?? '')
                  : row === guesses.length
                    ? (currentGuess[col] ?? '')
                    : '';
                const hint = guessRow?.hints?.[col];
                const bg = hint ? HINT_COLORS[hint] : 'transparent';
                const border = hint ? 'none' : '2px solid';
                const borderColor = 'divider';
                return (
                  <Box
                    key={col}
                    sx={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      border,
                      borderColor,
                      borderRadius: 0.5,
                      bgcolor: bg,
                      color: hint ? '#fff' : 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {letter}
                  </Box>
                );
              })}
            </Stack>
          ))}
        </Stack>

        {canGuess && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: 'block', textAlign: 'center' }}
          >
            Type a 5-letter word and press Enter. {6 - guesses.length} attempt
            {6 - guesses.length !== 1 ? 's' : ''} left.
          </Typography>
        )}

        {completed && (
          <Stack spacing={1} sx={{ mt: 2 }} alignItems="center">
            <Typography
              variant="h6"
              color={won ? 'success.main' : 'text.primary'}
            >
              {won ? 'You got it!' : "Today's word is done."}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleShare}
            >
              Share results
            </Button>
          </Stack>
        )}

        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 3 }}
          justifyContent="center"
          flexWrap="wrap"
          useFlexGap
        >
          {[
            'q',
            'w',
            'e',
            'r',
            't',
            'y',
            'u',
            'i',
            'o',
            'p',
            'a',
            's',
            'd',
            'f',
            'g',
            'h',
            'j',
            'k',
            'l',
            'z',
            'x',
            'c',
            'v',
            'b',
            'n',
            'm',
          ].map((key) => (
            <Button
              key={key}
              variant="outlined"
              size="small"
              sx={{ minWidth: 28, height: 36 }}
              onClick={() => handleKey(key)}
              disabled={completed || submitting}
            >
              {key}
            </Button>
          ))}
          <Button
            variant="outlined"
            size="small"
            sx={{ minWidth: 40 }}
            onClick={() => handleKey('Backspace')}
            disabled={completed || submitting}
          >
            ⌫
          </Button>
          <Button
            variant="contained"
            size="small"
            sx={{ minWidth: 44 }}
            onClick={() => currentGuess.length === COLS && void handleSubmit()}
            disabled={currentGuess.length !== COLS || submitting}
          >
            Enter
          </Button>
        </Stack>
      </Paper>
    </MiniGamePlayPageRoot>
  );
};

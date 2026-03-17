/**
 * Solo Hangman: word from approved list, guess letters, win by solving or lose by max wrong guesses.
 * State persists in game_sessions.state_payload; in-progress games survive refresh.
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
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  createHangmanSession,
  fetchSessionById,
  makeHangmanGuess,
} from '../../lib/api/gamesApi';
import type { HangmanStatePayload } from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';

const MAX_WRONG_DEFAULT = 6;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

function getState(session: GameSession): HangmanStatePayload {
  const raw = session.state_payload as HangmanStatePayload | undefined;
  return {
    word: raw?.word ?? '',
    guessedLetters: raw?.guessedLetters ?? [],
    wrongCount: raw?.wrongCount ?? 0,
    maxWrong: raw?.maxWrong ?? MAX_WRONG_DEFAULT,
  };
}

function getDisplayWord(state: HangmanStatePayload): string {
  const word = (state.word ?? '').toLowerCase();
  const guessed = new Set(
    (state.guessedLetters ?? []).map((c) => c.toLowerCase()),
  );
  return [...word]
    .map((c) => (/[a-z]/.test(c) && guessed.has(c) ? c : c === ' ' ? ' ' : '_'))
    .join(' ');
}

export const HangmanPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [guessing, setGuessing] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'hangman') {
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
    loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const handleGuess = useCallback(
    async (letter: string) => {
      if (!session?.id || session.status === 'completed') return;
      const state = getState(session);
      if ((state.guessedLetters ?? []).includes(letter.toLowerCase())) return;
      setGuessing(true);
      try {
        await makeHangmanGuess(session.id, letter);
        await loadSession(session.id);
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setGuessing(false);
      }
    },
    [session, loadSession, showToast],
  );

  const handleStartNew = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createHangmanSession();
      navigate(`/dashboard/games/hangman/${newSession.id}`, { replace: true });
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
            Hangman
          </Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 360 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Guess the word one letter at a time. You have 6 incorrect guesses
            before you lose.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<ReplayIcon />}
            disabled={startingNew}
            onClick={() => void handleStartNew()}
            aria-label="Start new Hangman game"
          >
            {startingNew ? 'Starting…' : 'Start new game'}
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!session) return null;

  const state = getState(session);
  const word = (state.word ?? '').toLowerCase();
  const guessedLetters = state.guessedLetters ?? [];
  const wrongCount = state.wrongCount ?? 0;
  const maxWrong = Math.max(1, state.maxWrong ?? MAX_WRONG_DEFAULT);
  const completed = session.status === 'completed';
  const won = session.result === 'solved';
  const lost = session.result === 'failed';
  const displayWord = getDisplayWord(state);
  const remaining = maxWrong - wrongCount;

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
            Hangman
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

      <Paper variant="outlined" sx={{ p: 2, maxWidth: 520, mx: 'auto' }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, textAlign: 'center' }}
          aria-live="polite"
        >
          {completed
            ? won
              ? 'You solved it!'
              : lost
                ? 'Out of guesses.'
                : ''
            : `Wrong: ${wrongCount} / ${maxWrong} · ${remaining} attempt${remaining !== 1 ? 's' : ''} left`}
        </Typography>

        <Typography
          component="div"
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            fontWeight: 600,
            letterSpacing: 4,
            textAlign: 'center',
            fontFamily: 'monospace',
            mb: 3,
            minHeight: 48,
          }}
          aria-label={`Word: ${displayWord.replace(/\s/g, ' ')}`}
        >
          {displayWord}
        </Typography>

        {completed && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 2 }}
          >
            The word was <strong>{word}</strong>.
          </Typography>
        )}

        {!completed && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 0.5,
            }}
          >
            {ALPHABET.map((letter) => {
              const used = guessedLetters.includes(letter);
              const isWrong = used && !word.includes(letter);
              return (
                <Button
                  key={letter}
                  variant="outlined"
                  size="small"
                  disabled={used || guessing}
                  onClick={() => void handleGuess(letter)}
                  aria-label={
                    used ? `Already guessed ${letter}` : `Guess ${letter}`
                  }
                  sx={{
                    minWidth: 36,
                    color: isWrong ? 'error.main' : undefined,
                    borderColor: isWrong ? 'error.main' : undefined,
                  }}
                >
                  {letter.toUpperCase()}
                </Button>
              );
            })}
          </Box>
        )}

        {completed && (
          <Stack
            direction="row"
            justifyContent="center"
            spacing={1}
            sx={{ mt: 2 }}
          >
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
        )}
      </Paper>
    </Box>
  );
};

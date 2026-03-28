/**
 * Trivia: solo or multiplayer. Questions one at a time; answer choices or freeform.
 * State (progress, scores, answers) persists in game_sessions.state_payload.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  createTriviaSoloSession,
  fetchSessionById,
  submitTriviaAnswer,
  type TriviaQuestion,
  type TriviaStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { useGameSessionRealtime } from '../../hooks/useGameSessionRealtime';
import type { GameSession, GameSessionParticipant } from '../../types/games';

function getTriviaState(session: GameSession): TriviaStatePayload {
  const raw = session.state_payload as TriviaStatePayload | undefined;
  return {
    questionIds: raw?.questionIds ?? [],
    currentQuestionIndex: raw?.currentQuestionIndex ?? 0,
    totalQuestions: raw?.totalQuestions ?? 0,
    scores: raw?.scores ?? {},
    answers: raw?.answers ?? [],
  };
}

function getMyScore(state: TriviaStatePayload, userId: string): number {
  return state.scores?.[userId] ?? 0;
}

function hasUserAnsweredQuestion(
  state: TriviaStatePayload,
  userId: string,
  questionIndex: number,
): boolean {
  return (state.answers ?? []).some(
    (a) => a.user_id === userId && a.q === questionIndex,
  );
}

export const TriviaPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [freeformAnswer, setFreeformAnswer] = useState('');
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastAnsweredIndex, setLastAnsweredIndex] = useState<number | null>(
    null,
  );

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      setQuestions([]);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'trivia') {
      setNotFound(true);
      setSession(null);
      setQuestions([]);
      return;
    }
    setSession(s);
    const state = getTriviaState(s);
    const ids = state.questionIds ?? [];
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from('trivia_questions')
        .select('*')
        .in('id', ids);
      if (!error) setQuestions((data ?? []) as TriviaQuestion[]);
      else setQuestions([]);
    } else {
      setQuestions([]);
    }
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setLoading(false);
      setNotFound(false);
      setSession(null);
      setQuestions([]);
      return;
    }
    setLoading(true);
    void loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);
  const refreshSession = useCallback(() => {
    if (sessionId?.trim()) void loadSession(sessionId.trim());
  }, [sessionId, loadSession]);
  useGameSessionRealtime(sessionId, refreshSession, Boolean(sessionId?.trim()));

  const state = session ? getTriviaState(session) : null;
  const currentIndex = state?.currentQuestionIndex ?? 0;
  const totalQuestions = state?.totalQuestions ?? 0;
  const currentQuestion = useMemo(
    () => (questions.length > currentIndex ? questions[currentIndex] : null),
    [questions, currentIndex],
  );
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then((s) => {
      setUserId(s.data.session?.user?.id ?? null);
    });
  }, []);

  const isSolo = useMemo(() => {
    const participants = (session?.participants ??
      []) as GameSessionParticipant[];
    return (
      participants.filter((p) => p.acceptance_state === 'accepted').length <= 1
    );
  }, [session]);

  const alreadyAnswered = useMemo(
    () =>
      state && userId
        ? hasUserAnsweredQuestion(state, userId, currentIndex)
        : false,
    [state, userId, currentIndex],
  );

  useEffect(() => {
    if (lastAnsweredIndex !== null && currentIndex !== lastAnsweredIndex) {
      setLastCorrect(null);
      setLastAnsweredIndex(null);
    }
  }, [currentIndex, lastAnsweredIndex]);

  const handleSubmit = useCallback(
    async (answer: string) => {
      if (!session?.id || session.status === 'completed' || !userId) return;
      const trimmed = answer.trim();
      setSubmitting(true);
      setLastCorrect(null);
      try {
        await submitTriviaAnswer(session.id, currentIndex, trimmed);
        await loadSession(session.id);
        const updated = await fetchSessionById(session.id);
        if (updated) {
          const st = getTriviaState(updated);
          const myAnswer = (st.answers ?? []).find(
            (a) => a.q === currentIndex && a.user_id === userId,
          );
          setLastCorrect(myAnswer?.correct ?? false);
          setLastAnsweredIndex(currentIndex);
        }
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setSubmitting(false);
        setSelectedChoice('');
        setFreeformAnswer('');
      }
    },
    [session, currentIndex, userId, loadSession, showToast],
  );

  const handleStartNew = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createTriviaSoloSession();
      navigate(`/dashboard/games/trivia/${newSession.id}`, { replace: true });
      setSession(newSession);
      await loadSession(newSession.id);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStartingNew(false);
    }
  }, [navigate, loadSession, showToast]);

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
              ? 'Session not found or not a Trivia game.'
              : 'Start a Trivia game.'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => void handleStartNew()}
            disabled={startingNew}
          >
            {startingNew ? 'Starting…' : 'Start solo Trivia'}
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!session) return null;

  const triviaState = getTriviaState(session);
  const completed = session.status === 'completed';

  if (completed) {
    const scores = triviaState.scores ?? {};
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const winnerId = entries[0]?.[0];
    const isWinner = winnerId === userId;

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
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Trivia complete
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Your score: {userId ? getMyScore(triviaState, userId) : 0} /{' '}
            {totalQuestions}
          </Typography>
          {entries.length > 1 && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              {isWinner ? 'You won!' : `Winner: ${winnerId?.slice(0, 8)}…`}
            </Typography>
          )}
          <Button
            component={RouterLink}
            to="/dashboard/games"
            variant="outlined"
            sx={{ mt: 1 }}
          >
            Back to Games
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!currentQuestion) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">Loading question…</Typography>
        <CircularProgress size={24} sx={{ mt: 1 }} />
      </Box>
    );
  }

  const choices = Array.isArray(currentQuestion.choices)
    ? currentQuestion.choices
    : [];
  const hasChoices = choices.length > 0;

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
        <Typography variant="body2" color="text.secondary">
          Question {currentIndex + 1} of {totalQuestions}
          {userId && ` · Score: ${getMyScore(triviaState, userId)}`}
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          {currentQuestion.question_text}
        </Typography>

        {lastCorrect !== null && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            {lastCorrect ? (
              <>
                <CheckCircleIcon color="success" />
                <Typography color="success.main">Correct!</Typography>
              </>
            ) : (
              <>
                <CancelIcon color="error" />
                <Typography color="error">
                  Incorrect. Answer: {currentQuestion.correct_answer}
                </Typography>
              </>
            )}
          </Stack>
        )}

        {!alreadyAnswered ? (
          <>
            {hasChoices ? (
              <RadioGroup
                value={selectedChoice}
                onChange={(_, v) => setSelectedChoice(v)}
                sx={{ mb: 2 }}
              >
                {choices.map((c) => (
                  <Stack key={c} direction="row" alignItems="center">
                    <Radio value={c} id={`choice-${c}`} />
                    <Typography
                      component="label"
                      htmlFor={`choice-${c}`}
                      sx={{ cursor: 'pointer' }}
                    >
                      {c}
                    </Typography>
                  </Stack>
                ))}
              </RadioGroup>
            ) : (
              <TextField
                fullWidth
                label="Your answer"
                value={freeformAnswer}
                onChange={(e) => setFreeformAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleSubmit(
                      hasChoices ? selectedChoice : freeformAnswer,
                    );
                  }
                }}
                sx={{ mb: 2 }}
                aria-label="Type your answer"
              />
            )}
            <Button
              variant="contained"
              disabled={
                submitting ||
                (hasChoices ? !selectedChoice : !freeformAnswer.trim())
              }
              onClick={() =>
                void handleSubmit(
                  hasChoices ? selectedChoice : freeformAnswer.trim(),
                )
              }
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </>
        ) : (
          <Typography color="text.secondary">
            {isSolo
              ? 'Loading next question…'
              : 'Waiting for others to answer…'}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

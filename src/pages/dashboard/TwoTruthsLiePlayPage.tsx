/**
 * Two Truths and a Lie: one player submits three statements (two true, one lie);
 * others vote on which is the lie; results reveal the answer; scores tracked per round.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  advanceRoundTwoTruthsLie,
  fetchSessionForGameType,
  revealTwoTruthsLie,
  submitTwoTruthsLieStatements,
  submitTwoTruthsLieVote,
  type TwoTruthsLieStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import type { GameSession, GameSessionParticipant } from '../../types/games';

function getState(session: GameSession): TwoTruthsLieStatePayload {
  const raw = session.state_payload as TwoTruthsLieStatePayload | undefined;
  return {
    roundIndex: raw?.roundIndex ?? 0,
    submitterUserId: raw?.submitterUserId,
    statements: raw?.statements ?? null,
    lieIndex: raw?.lieIndex ?? null,
    votes: raw?.votes ?? {},
    revealed: raw?.revealed ?? false,
    scores: raw?.scores ?? {},
  };
}

function getParticipants(session: GameSession): GameSessionParticipant[] {
  return (session.participants ?? []).filter(
    (p) => (p as GameSessionParticipant).acceptance_state === 'accepted',
  ) as GameSessionParticipant[];
}

export const TwoTruthsLiePlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acting, setActing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [stmt0, setStmt0] = useState('');
  const [stmt1, setStmt1] = useState('');
  const [stmt2, setStmt2] = useState('');
  const [lieIndex, setLieIndex] = useState<0 | 1 | 2>(0);
  const [voteIndex, setVoteIndex] = useState<0 | 1 | 2 | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then((s) => {
      setUserId(s.data.session?.user?.id ?? null);
    });
  }, []);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'two_truths_lie');
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
      setSession(null);
      return;
    }
    setLoading(true);
    void loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const pollInterval = session?.id && session.status === 'active' ? 4000 : 0;
  useEffect(() => {
    if (!pollInterval || !sessionId) return;
    const t = setInterval(() => void loadSession(sessionId), pollInterval);
    return () => clearInterval(t);
  }, [pollInterval, sessionId, loadSession]);

  const state = session ? getState(session) : null;
  const participants = session ? getParticipants(session) : [];
  const orderedIds = participants
    .sort((a, b) => (a.turn_order_position ?? 0) - (b.turn_order_position ?? 0))
    .map((p) => p.user_id);
  const isSubmitter = state && userId === state.submitterUserId;
  const hasStatements =
    state?.statements != null &&
    Array.isArray(state.statements) &&
    state.statements.length === 3;
  const myVote = state && userId ? state.votes?.[userId] : undefined;
  const voterIds = orderedIds.filter((id) => id !== state?.submitterUserId);
  const allVoted =
    hasStatements &&
    state &&
    voterIds.length > 0 &&
    voterIds.every((id) => state.votes?.[id] != null);
  const revealed = state?.revealed ?? false;
  const myScore = state && userId ? (state.scores?.[userId] ?? 0) : 0;

  const handleSubmitStatements = useCallback(async () => {
    if (!session?.id || !userId || acting) return;
    const s0 = stmt0.trim();
    const s1 = stmt1.trim();
    const s2 = stmt2.trim();
    if (!s0 || !s1 || !s2) {
      showToast({
        message: 'All three statements are required.',
        severity: 'warning',
      });
      return;
    }
    setActing(true);
    try {
      await submitTwoTruthsLieStatements(session.id, [s0, s1, s2], lieIndex);
      setStmt0('');
      setStmt1('');
      setStmt2('');
      setLieIndex(0);
      await loadSession(session.id);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setActing(false);
    }
  }, [
    session,
    userId,
    stmt0,
    stmt1,
    stmt2,
    lieIndex,
    acting,
    loadSession,
    showToast,
  ]);

  const handleVote = useCallback(
    async (index: 0 | 1 | 2) => {
      if (!session?.id || acting) return;
      setActing(true);
      try {
        await submitTwoTruthsLieVote(session.id, index);
        setVoteIndex(index);
        await loadSession(session.id);
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setActing(false);
      }
    },
    [session, acting, loadSession, showToast],
  );

  const handleReveal = useCallback(async () => {
    if (!session?.id || acting) return;
    setActing(true);
    try {
      await revealTwoTruthsLie(session.id);
      await loadSession(session.id);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setActing(false);
    }
  }, [session, acting, loadSession, showToast]);

  const handleAdvance = useCallback(async () => {
    if (!session?.id || acting) return;
    setActing(true);
    try {
      await advanceRoundTwoTruthsLie(session.id);
      setVoteIndex(null);
      await loadSession(session.id);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setActing(false);
    }
  }, [session, acting, loadSession, showToast]);

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
              ? 'Session not found or not a Two Truths and a Lie game.'
              : 'Start this game by inviting connections from the Games page.'}
          </Typography>
          <Button component={RouterLink} to="/dashboard/games">
            Back to Games
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!session || !state) return null;

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
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Round {(state.roundIndex ?? 0) + 1}
          </Typography>
          <Paper variant="outlined" sx={{ px: 2, py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Your score
            </Typography>
            <Typography variant="h6">{myScore}</Typography>
          </Paper>
        </Stack>
      </Stack>

      {revealed ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            The lie was statement {(state.lieIndex ?? 0) + 1}
          </Typography>
          {state.statements && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {state.statements.map((s, i) => (
                <Typography
                  key={i}
                  variant="body1"
                  sx={{
                    fontWeight: i === state.lieIndex ? 700 : 400,
                    color: i === state.lieIndex ? 'error.main' : 'text.primary',
                  }}
                >
                  {i + 1}. {s}
                </Typography>
              ))}
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Scores:{' '}
            {Object.entries(state.scores ?? {})
              .map(([id, sc]) => `${id.slice(0, 8)}…: ${sc}`)
              .join(', ')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => void handleAdvance()}
            disabled={acting}
          >
            {acting ? 'Advancing…' : 'Next round'}
          </Button>
        </Paper>
      ) : isSubmitter && !hasStatements ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Your turn: submit two truths and one lie
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Statement 1"
              value={stmt0}
              onChange={(e) => setStmt0(e.target.value)}
              placeholder="A true or false fact about you"
            />
            <TextField
              fullWidth
              label="Statement 2"
              value={stmt1}
              onChange={(e) => setStmt1(e.target.value)}
              placeholder="A true or false fact about you"
            />
            <TextField
              fullWidth
              label="Statement 3"
              value={stmt2}
              onChange={(e) => setStmt2(e.target.value)}
              placeholder="A true or false fact about you"
            />
            <Typography variant="subtitle2" color="text.secondary">
              Which one is the lie?
            </Typography>
            <RadioGroup
              row
              value={lieIndex}
              onChange={(_, v) => setLieIndex(Number(v) as 0 | 1 | 2)}
            >
              <Stack direction="row" spacing={2}>
                {([0, 1, 2] as const).map((i) => (
                  <Stack key={i} direction="row" alignItems="center">
                    <Radio value={i} id={`lie-${i}`} />
                    <Typography
                      component="label"
                      htmlFor={`lie-${i}`}
                      sx={{ cursor: 'pointer' }}
                    >
                      Statement {i + 1}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </RadioGroup>
            <Button
              variant="contained"
              onClick={() => void handleSubmitStatements()}
              disabled={acting}
            >
              {acting ? 'Submitting…' : 'Submit'}
            </Button>
          </Stack>
        </Paper>
      ) : isSubmitter && hasStatements ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Waiting for others to vote
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            {Object.keys(state.votes ?? {}).length} of {voterIds.length} have
            voted.
          </Typography>
          {allVoted && (
            <Button
              size="small"
              sx={{ ml: 1 }}
              onClick={() => void handleReveal()}
              disabled={acting}
            >
              {acting ? 'Revealing…' : 'Reveal'}
            </Button>
          )}
        </Paper>
      ) : hasStatements && !revealed ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Which statement is the lie?
          </Typography>
          <RadioGroup
            value={myVote ?? voteIndex ?? ''}
            onChange={(_, v) => {
              const n = Number(v) as 0 | 1 | 2;
              if (myVote == null) void handleVote(n);
            }}
          >
            <Stack spacing={1}>
              {state.statements!.map((s, i) => (
                <Stack key={i} direction="row" alignItems="flex-start">
                  <Radio
                    value={i}
                    id={`vote-${i}`}
                    disabled={myVote != null || acting}
                  />
                  <Typography
                    component="label"
                    htmlFor={`vote-${i}`}
                    sx={{
                      cursor: myVote == null ? 'pointer' : 'default',
                      flex: 1,
                    }}
                  >
                    {s}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </RadioGroup>
          {myVote != null && (
            <Stack
              direction="row"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                You voted for statement {myVote + 1}. Waiting for others.
              </Typography>
              {allVoted && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void handleReveal()}
                  disabled={acting}
                >
                  {acting ? 'Revealing…' : 'Reveal results'}
                </Button>
              )}
            </Stack>
          )}
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">
            Waiting for the submitter to add their statements…
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

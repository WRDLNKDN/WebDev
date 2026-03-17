/**
 * Would You Rather: two-option prompts; players choose A or B;
 * results show percentage per option; prompts rotate after reveal.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  advancePromptWouldYouRather,
  fetchSessionById,
  revealWouldYouRather,
  submitWouldYouRatherVote,
  type WouldYouRatherPrompt,
  type WouldYouRatherStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import type { GameSession, GameSessionParticipant } from '../../types/games';

function getState(session: GameSession): WouldYouRatherStatePayload {
  const raw = session.state_payload as WouldYouRatherStatePayload | undefined;
  return {
    promptIds: raw?.promptIds ?? [],
    promptIndex: raw?.promptIndex ?? 0,
    votes: raw?.votes ?? {},
    revealed: raw?.revealed ?? false,
  };
}

function getParticipants(session: GameSession): GameSessionParticipant[] {
  return (session.participants ?? []).filter(
    (p) => (p as GameSessionParticipant).acceptance_state === 'accepted',
  ) as GameSessionParticipant[];
}

export const WouldYouRatherPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [prompts, setPrompts] = useState<WouldYouRatherPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acting, setActing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then((s) => {
      setUserId(s.data.session?.user?.id ?? null);
    });
  }, []);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      setPrompts([]);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'would_you_rather') {
      setNotFound(true);
      setSession(null);
      setPrompts([]);
      return;
    }
    setSession(s);
    const state = getState(s);
    const ids = state.promptIds ?? [];
    if (ids.length > 0) {
      const { data } = await supabase
        .from('would_you_rather_prompts')
        .select('*')
        .in('id', ids);
      const ordered = (ids as string[])
        .map((id) => (data ?? []).find((r: { id: string }) => r.id === id))
        .filter(Boolean) as WouldYouRatherPrompt[];
      setPrompts(ordered);
    } else {
      setPrompts([]);
    }
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setLoading(false);
      setSession(null);
      setPrompts([]);
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
  const participants = useMemo(
    () => (session ? getParticipants(session) : []),
    [session],
  );
  const participantIds = useMemo(
    () => participants.map((p) => p.user_id),
    [participants],
  );
  const currentIndex = state?.promptIndex ?? 0;
  const currentPrompt = useMemo(
    () => (prompts.length > currentIndex ? prompts[currentIndex] : null),
    [prompts, currentIndex],
  );
  const votes = useMemo(() => state?.votes ?? {}, [state]);
  const revealed = state?.revealed ?? false;
  const voteCount = Object.keys(votes).length;
  const totalVoters = participantIds.length;
  const allVoted = totalVoters > 0 && voteCount >= totalVoters;

  const countA = useMemo(
    () => Object.values(votes).filter((v) => v === 'A').length,
    [votes],
  );
  const countB = useMemo(
    () => Object.values(votes).filter((v) => v === 'B').length,
    [votes],
  );
  const pctA = totalVoters > 0 ? Math.round((countA / totalVoters) * 100) : 0;
  const pctB = totalVoters > 0 ? Math.round((countB / totalVoters) * 100) : 0;

  const handleVote = useCallback(
    async (choice: 'A' | 'B') => {
      if (!session?.id || acting) return;
      setActing(true);
      try {
        await submitWouldYouRatherVote(session.id, choice);
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
      await revealWouldYouRather(session.id);
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
      await advancePromptWouldYouRather(session.id);
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
              ? 'Session not found or not a Would You Rather game.'
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

  const myVoteValue = userId ? state.votes?.[userId] : undefined;

  if (!currentPrompt) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">Loading prompt…</Typography>
        <CircularProgress size={24} sx={{ mt: 1 }} />
      </Box>
    );
  }

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
          Prompt {currentIndex + 1} of {prompts.length}
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }} textAlign="center">
          Would you rather…
        </Typography>

        {revealed ? (
          <>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Box>
                <Typography variant="body1" sx={{ mb: 0.5 }}>
                  {currentPrompt.text_a}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={pctA}
                  sx={{ height: 8, borderRadius: 1 }}
                  color="primary"
                />
                <Typography variant="body2" color="text.secondary">
                  {pctA}% ({countA} {countA === 1 ? 'vote' : 'votes'})
                </Typography>
              </Box>
              <Box>
                <Typography variant="body1" sx={{ mb: 0.5 }}>
                  {currentPrompt.text_b}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={pctB}
                  sx={{ height: 8, borderRadius: 1 }}
                  color="secondary"
                />
                <Typography variant="body2" color="text.secondary">
                  {pctB}% ({countB} {countB === 1 ? 'vote' : 'votes'})
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              fullWidth
              onClick={() => void handleAdvance()}
              disabled={acting}
            >
              {acting ? 'Next…' : 'Next prompt'}
            </Button>
          </>
        ) : myVoteValue != null ? (
          <Stack spacing={2}>
            <Typography variant="body1" color="text.secondary">
              You chose:{' '}
              {myVoteValue === 'A'
                ? currentPrompt.text_a
                : currentPrompt.text_b}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {voteCount} of {totalVoters} voted.
              {allVoted && (
                <Button
                  size="small"
                  sx={{ ml: 1 }}
                  onClick={() => void handleReveal()}
                  disabled={acting}
                >
                  {acting ? 'Revealing…' : 'Reveal results'}
                </Button>
              )}
            </Typography>
          </Stack>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              fullWidth
              sx={{ py: 2 }}
              onClick={() => void handleVote('A')}
              disabled={acting}
            >
              <Typography component="span" sx={{ textAlign: 'center', px: 1 }}>
                {currentPrompt.text_a}
              </Typography>
            </Button>
            <Button
              variant="outlined"
              fullWidth
              sx={{ py: 2 }}
              onClick={() => void handleVote('B')}
              disabled={acting}
            >
              <Typography component="span" sx={{ textAlign: 'center', px: 1 }}>
                {currentPrompt.text_b}
              </Typography>
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

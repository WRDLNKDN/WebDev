/**
 * Scrabble-style: 2–4 players, invite connections. Place tiles to form words;
 * words validated against dictionary; score and turn order persisted.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  fetchSessionById,
  passScrabbleTurn,
  playScrabbleWord,
  startScrabbleGame,
  type ScrabblePlacement,
  type ScrabbleStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import type { GameSession, GameSessionParticipant } from '../../types/games';

const BOARD_SIZE = 15;
const CELL_PX = 28;
const CENTER = 7;

function getState(session: GameSession): ScrabbleStatePayload {
  const raw = session.state_payload as ScrabbleStatePayload | undefined;
  const phase = raw?.phase ?? 'waiting_players';
  const boardRaw = raw?.board;
  let board: (string | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  if (Array.isArray(boardRaw) && boardRaw.length === BOARD_SIZE) {
    board = boardRaw.map((row) =>
      Array.isArray(row) && row.length === BOARD_SIZE
        ? row.map((c) => (c != null && c !== '' ? String(c) : null))
        : Array.from({ length: BOARD_SIZE }, () => null),
    );
  }
  const racks = raw?.racks ?? {};
  const scores = raw?.scores ?? {};
  const currentTurnPosition = raw?.currentTurnPosition ?? 0;
  return {
    phase,
    board,
    tileBag: Array.isArray(raw?.tileBag) ? raw.tileBag : [],
    racks: typeof racks === 'object' ? racks : {},
    currentTurnPosition,
    scores: typeof scores === 'object' ? scores : {},
    passCount: raw?.passCount,
    winnerPosition:
      raw?.winnerPosition != null ? Number(raw.winnerPosition) : undefined,
  };
}

function getMyRack(state: ScrabbleStatePayload, myPosition: number): string[] {
  const rack = state.racks?.[String(myPosition)];
  return Array.isArray(rack) ? rack.map((c) => String(c).toUpperCase()) : [];
}

export const ScrabblePlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState<ScrabblePlacement[]>([]);
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(
    null,
  );

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'scrabble') {
      setNotFound(true);
      setSession(null);
      return;
    }
    setSession(s);
    setNotFound(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (!cancelled) setMyUserId(authSession?.user?.id ?? null);
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const refreshSession = useCallback(() => {
    if (sessionId?.trim()) void loadSession(sessionId.trim());
  }, [sessionId, loadSession]);

  const participants = useMemo(
    () => (session?.participants ?? []) as GameSessionParticipant[],
    [session],
  );
  const ordered = useMemo(
    () =>
      [...participants].sort(
        (a, b) => (a.turn_order_position ?? 0) - (b.turn_order_position ?? 0),
      ),
    [participants],
  );
  const myPosition = ordered.findIndex((p) => p.user_id === myUserId);
  const state = session ? getState(session) : null;
  const phase = state?.phase ?? 'waiting_players';
  const myRack = useMemo(
    () => (state ? getMyRack(state, myPosition >= 0 ? myPosition : 0) : []),
    [state, myPosition],
  );
  const draftLetters = draft.map((p) => p.letter);
  const remainingRack = useMemo(() => {
    const r = [...myRack];
    for (const letter of draftLetters) {
      const i = r.findIndex((c) => c === letter || c === letter.toUpperCase());
      if (i >= 0) r.splice(i, 1);
    }
    return r;
  }, [myRack, draftLetters]);
  const myTurn =
    phase === 'playing' && (state?.currentTurnPosition ?? 0) === myPosition;
  const acceptedCount = ordered.filter(
    (p) => p.acceptance_state === 'accepted',
  ).length;
  const canStart =
    phase === 'waiting_players' &&
    acceptedCount >= 2 &&
    acceptedCount <= 4 &&
    myPosition >= 0;

  const handleStartGame = useCallback(async () => {
    if (!session?.id || !canStart || starting) return;
    setStarting(true);
    try {
      await startScrabbleGame(session.id);
      await loadSession(session.id);
      showToast({ message: 'Game started.', severity: 'success' });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStarting(false);
    }
  }, [session, canStart, starting, loadSession, showToast]);

  const handleRackClick = useCallback((index: number) => {
    setSelectedRackIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleBoardCellClick = useCallback(
    (r: number, c: number) => {
      if (phase !== 'playing' || !myTurn || submitting) return;
      const existing = state?.board?.[r]?.[c];
      if (existing) return;
      const draftAt = draft.find((p) => p.r === r && p.c === c);
      if (draftAt) {
        setDraft((prev) => prev.filter((p) => !(p.r === r && p.c === c)));
        return;
      }
      if (
        selectedRackIndex == null ||
        selectedRackIndex >= remainingRack.length
      )
        return;
      const letter = remainingRack[selectedRackIndex];
      setDraft((prev) => [...prev, { r, c, letter }]);
      setSelectedRackIndex(null);
    },
    [
      phase,
      myTurn,
      submitting,
      state?.board,
      draft,
      selectedRackIndex,
      remainingRack,
    ],
  );

  const handleSubmitWord = useCallback(async () => {
    if (!session?.id || draft.length === 0 || submitting || !myTurn) return;
    setSubmitting(true);
    try {
      await playScrabbleWord(session.id, draft);
      await loadSession(session.id);
      setDraft([]);
      showToast({ message: 'Word accepted.', severity: 'success' });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [session, draft, submitting, myTurn, loadSession, showToast]);

  const handleClearDraft = useCallback(() => {
    setDraft([]);
    setSelectedRackIndex(null);
  }, []);

  const handlePassTurn = useCallback(async () => {
    if (!session?.id || submitting || !myTurn) return;
    setSubmitting(true);
    try {
      await passScrabbleTurn(session.id);
      await loadSession(session.id);
      showToast({ message: 'Turn passed.', severity: 'info' });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [session, submitting, myTurn, loadSession, showToast]);

  if (loading || notFound) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        {loading && <CircularProgress aria-label="Loading game" />}
        {notFound && (
          <Stack spacing={2} alignItems="center">
            <Typography color="text.secondary">Game not found.</Typography>
            <Button
              component={RouterLink}
              to="/dashboard/games"
              variant="contained"
            >
              Back to Games
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  if (!session) return null;

  if (
    session.status === 'pending_invitation' ||
    session.status === 'declined' ||
    session.status === 'canceled'
  ) {
    const isInvitee = ordered.some(
      (p) => p.user_id === myUserId && p.role === 'invitee',
    );
    const message =
      session.status === 'pending_invitation'
        ? isInvitee
          ? "You've been invited. Accept or decline from the Games page."
          : 'Waiting for connections to accept.'
        : session.status === 'declined'
          ? 'This game was declined.'
          : 'This game was canceled.';
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
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 360 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {message}
          </Typography>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            variant="contained"
            fullWidth
          >
            Go to Games
          </Button>
        </Paper>
      </Box>
    );
  }

  const board = state?.board ?? [];
  const scores = state?.scores ?? {};
  const winnerPosition = state?.winnerPosition ?? null;
  const isCompleted = phase === 'completed' || session.status === 'completed';

  if (isCompleted) {
    const winnerLabel =
      winnerPosition != null
        ? ((
            ordered[winnerPosition] as GameSessionParticipant & {
              display_name?: string;
            }
          )?.display_name ?? `Player ${(winnerPosition as number) + 1}`)
        : null;
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
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 420 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Game over
          </Typography>
          {winnerLabel != null && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Winner: {winnerLabel}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Final scores:{' '}
            {ordered
              .map((_, i) => `P${i + 1}: ${scores[String(i)] ?? 0}`)
              .join(' · ')}
          </Typography>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            variant="contained"
          >
            Back to Games
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
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
          Scrabble
        </Typography>
        {phase === 'playing' && (
          <Typography variant="body2" color="text.secondary">
            Scores:{' '}
            {ordered
              .map((_, i) => `P${i + 1}: ${scores[String(i)] ?? 0}`)
              .join(' · ')}
          </Typography>
        )}
        {!myTurn && phase === 'playing' && (
          <Button size="small" variant="outlined" onClick={refreshSession}>
            Refresh
          </Button>
        )}
      </Stack>

      {phase === 'waiting_players' && (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 420 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {acceptedCount} of 2–4 players have joined. Once at least 2 have
            accepted, anyone can start the game.
          </Typography>
          {canStart && (
            <Button
              variant="contained"
              onClick={() => void handleStartGame()}
              disabled={starting}
            >
              {starting ? 'Starting…' : 'Start game'}
            </Button>
          )}
        </Paper>
      )}

      {phase === 'playing' && (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {myTurn
              ? 'Your turn — place tiles and submit a word.'
              : "Opponent's turn."}
          </Typography>
          <Paper variant="outlined" sx={{ p: 0.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_PX}px)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_PX}px)`,
                gap: 0.5,
                bgcolor: 'primary.dark',
              }}
              role="grid"
              aria-label="Scrabble board"
            >
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
                const r = Math.floor(i / BOARD_SIZE);
                const c = i % BOARD_SIZE;
                const letter =
                  board[r]?.[c] ??
                  draft.find((p) => p.r === r && p.c === c)?.letter ??
                  null;
                const isCenter = r === CENTER && c === CENTER;
                const isDraft = draft.some((p) => p.r === r && p.c === c);
                return (
                  <Box
                    key={i}
                    role="gridcell"
                    aria-label={
                      letter
                        ? `Row ${r + 1} col ${c + 1}, letter ${letter}`
                        : `Row ${r + 1} col ${c + 1} empty`
                    }
                    component="button"
                    type="button"
                    onClick={() => handleBoardCellClick(r, c)}
                    disabled={!myTurn || submitting}
                    sx={{
                      width: CELL_PX,
                      height: CELL_PX,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 0.5,
                      bgcolor: isCenter ? 'primary.main' : 'background.paper',
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: myTurn && !submitting ? 'pointer' : 'default',
                      opacity: isDraft ? 0.9 : 1,
                    }}
                  >
                    {letter ?? (isCenter ? '★' : '')}
                  </Box>
                );
              })}
            </Box>
          </Paper>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="subtitle2" color="text.secondary">
              Your rack:
            </Typography>
            {remainingRack.map((letter, index) => (
              <Button
                key={`${index}-${letter}`}
                variant={selectedRackIndex === index ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleRackClick(index)}
                disabled={!myTurn || submitting}
                sx={{ minWidth: 32, fontWeight: 700 }}
              >
                {letter}
              </Button>
            ))}
          </Stack>

          {myTurn && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {draft.length > 0 && (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => void handleSubmitWord()}
                    disabled={submitting}
                  >
                    Submit word
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleClearDraft}
                  >
                    Clear
                  </Button>
                </>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={() => void handlePassTurn()}
                disabled={submitting}
                color="inherit"
              >
                Pass
              </Button>
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
};

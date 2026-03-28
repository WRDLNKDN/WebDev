/**
 * Two-player Chess: invite a connection, standard rules, move validation,
 * check/checkmate/stalemate, persistent state and move history.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  fetchSessionById,
  getChessLegalMoves,
  makeChessMove,
  startChessGame,
  type ChessStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { useGameSessionRealtime } from '../../hooks/useGameSessionRealtime';
import type { GameSession, GameSessionParticipant } from '../../types/games';
import {
  MiniGameLoadingNotFound,
  MiniGamePlayHeaderRow,
  MiniGamePlayPageRoot,
} from './games/MiniGamePlayChrome';

const SIZE = 8;
const CELL_PX = 44;

const PIECE_SYMBOLS: Record<string, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

function getState(session: GameSession): ChessStatePayload {
  const raw = session.state_payload as ChessStatePayload | undefined;
  const phase = raw?.phase ?? 'waiting_players';
  const boardRaw = raw?.board;
  let board: (string | null)[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => null),
  );
  if (Array.isArray(boardRaw) && boardRaw.length === SIZE) {
    board = boardRaw.map((row) =>
      Array.isArray(row) && row.length === SIZE
        ? row.map((c) => (c != null && c !== '' ? String(c) : null))
        : Array.from({ length: SIZE }, () => null),
    );
  }
  return {
    phase,
    board,
    turn: raw?.turn ?? 'white',
    moveHistory: Array.isArray(raw?.moveHistory) ? raw.moveHistory : [],
    captured: raw?.captured ?? { white: [], black: [] },
    gameOver: raw?.gameOver ?? null,
    winner: raw?.winner ?? null,
    inCheck: raw?.inCheck ?? false,
  };
}

function rcToSquare(r: number, c: number): string {
  return String.fromCharCode(97 + c) + (8 - r);
}

export const ChessPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalToSquares, setLegalToSquares] = useState<string[]>([]);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'chess') {
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
  useGameSessionRealtime(sessionId, refreshSession, Boolean(sessionId?.trim()));

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
  const mySide = myPosition === 0 ? 'white' : 'black';
  const myTurn = phase === 'playing' && (state?.turn ?? 'white') === mySide;
  const acceptedCount = ordered.filter(
    (p) => p.acceptance_state === 'accepted',
  ).length;
  const canStart =
    phase === 'waiting_players' && acceptedCount === 2 && myPosition >= 0;

  const handleStartGame = useCallback(async () => {
    if (!session?.id || !canStart || starting) return;
    setStarting(true);
    try {
      await startChessGame(session.id);
      await loadSession(session.id);
      showToast({ message: 'Game started.', severity: 'success' });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStarting(false);
    }
  }, [session, canStart, starting, loadSession, showToast]);

  useEffect(() => {
    if (!session?.id || !selectedSquare || phase !== 'playing') {
      setLegalToSquares([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const moves = await getChessLegalMoves(session.id, selectedSquare);
        if (!cancelled) setLegalToSquares(moves);
      } catch {
        if (!cancelled) setLegalToSquares([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session?.id, selectedSquare, phase]);

  const handleSquareClick = useCallback(
    async (boardRow: number, boardCol: number) => {
      if (!session?.id || phase !== 'playing' || submitting) return;
      const square = rcToSquare(boardRow, boardCol);
      const piece = state?.board?.[boardRow]?.[boardCol];
      const isMyPiece =
        (mySide === 'white' &&
          piece != null &&
          piece === piece.toUpperCase() &&
          piece !== '') ||
        (mySide === 'black' &&
          piece != null &&
          piece === piece.toLowerCase() &&
          piece !== '');

      if (selectedSquare) {
        if (legalToSquares.includes(square)) {
          setSubmitting(true);
          try {
            await makeChessMove(session.id, selectedSquare, square);
            await loadSession(session.id);
            setSelectedSquare(null);
            setLegalToSquares([]);
            showToast({ message: 'Move played.', severity: 'success' });
          } catch (e) {
            showToast({ message: toMessage(e), severity: 'error' });
          } finally {
            setSubmitting(false);
          }
          return;
        }
        if (square === selectedSquare || !isMyPiece) {
          setSelectedSquare(null);
          setLegalToSquares([]);
          return;
        }
      }
      if (isMyPiece && myTurn) {
        setSelectedSquare(square);
      }
    },
    [
      session,
      phase,
      state?.board,
      mySide,
      myTurn,
      selectedSquare,
      legalToSquares,
      submitting,
      loadSession,
      showToast,
    ],
  );

  if (loading || notFound) {
    return <MiniGameLoadingNotFound loading={loading} notFound={notFound} />;
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
          : 'Waiting for your connection to accept.'
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
  const isCompleted = phase === 'completed' || session.status === 'completed';
  const capturedWhite = state?.captured?.white ?? [];
  const capturedBlack = state?.captured?.black ?? [];
  const moveHistory = state?.moveHistory ?? [];

  if (isCompleted) {
    const winnerLabel =
      state?.winner != null
        ? state.winner === mySide
          ? 'You'
          : 'Opponent'
        : null;
    return (
      <MiniGamePlayPageRoot>
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
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {state?.gameOver === 'checkmate' &&
              winnerLabel != null &&
              `${winnerLabel} won by checkmate.`}
            {state?.gameOver === 'stalemate' && 'Stalemate — draw.'}
            {state?.gameOver === 'draw_50' && 'Draw (50-move rule).'}
            {state?.gameOver === 'checkmate' &&
              winnerLabel == null &&
              'Checkmate.'}
          </Typography>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            variant="contained"
          >
            Back to Games
          </Button>
        </Paper>
      </MiniGamePlayPageRoot>
    );
  }

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Chess"
        showStats={phase === 'playing'}
        stats={
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            flexWrap="wrap"
          >
            <Typography
              variant="body2"
              color="text.secondary"
              aria-live="polite"
            >
              {myTurn ? 'Your turn (' + mySide + ').' : "Opponent's turn."}
              {state?.inCheck && ' Check!'}
            </Typography>
            {!myTurn && (
              <Button
                size="small"
                variant="outlined"
                onClick={refreshSession}
                disabled={submitting}
              >
                Refresh
              </Button>
            )}
          </Stack>
        }
      />

      {phase === 'waiting_players' && (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 420 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {acceptedCount} of 2 players have joined. Once both have accepted,
            either player can start the game.
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
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems="flex-start"
        >
          <Paper variant="outlined" sx={{ p: 0.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${SIZE}, ${CELL_PX}px)`,
                gridTemplateRows: `repeat(${SIZE}, ${CELL_PX}px)`,
                gap: 0,
              }}
              role="grid"
              aria-label="Chess board"
            >
              {Array.from({ length: SIZE * SIZE }, (_, i) => {
                const displayRow = Math.floor(i / SIZE);
                const displayCol = i % SIZE;
                const boardRow = 7 - displayRow;
                const boardCol = displayCol;
                const piece = board[boardRow]?.[boardCol] ?? null;
                const square = rcToSquare(boardRow, boardCol);
                const isLight = (boardRow + boardCol) % 2 === 1;
                const isSelected = selectedSquare === square;
                const isLegalTo = legalToSquares.includes(square);
                return (
                  <Box
                    key={square}
                    role="gridcell"
                    aria-label={
                      piece
                        ? `Square ${square}, ${piece}`
                        : `Square ${square} empty`
                    }
                    component="button"
                    type="button"
                    onClick={() => void handleSquareClick(boardRow, boardCol)}
                    disabled={!myTurn || submitting}
                    sx={{
                      width: CELL_PX,
                      height: CELL_PX,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 0,
                      bgcolor: isSelected
                        ? 'primary.main'
                        : isLegalTo
                          ? 'action.selected'
                          : isLight
                            ? 'grey.300'
                            : 'grey.600',
                      color:
                        piece && piece === piece.toUpperCase()
                          ? 'grey.900'
                          : 'grey.100',
                      fontSize: '1.5rem',
                      cursor: myTurn && !submitting ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {piece
                      ? (PIECE_SYMBOLS[piece] ?? piece)
                      : isLegalTo
                        ? '◦'
                        : ''}
                  </Box>
                );
              })}
            </Box>
          </Paper>

          <Stack spacing={1} sx={{ minWidth: 200 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Captured by white
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
            >
              {capturedWhite.map((p, i) => (
                <span key={`w-${i}-${p}`}>{PIECE_SYMBOLS[p] ?? p}</span>
              ))}
              {capturedWhite.length === 0 && '—'}
            </Typography>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Captured by black
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
            >
              {capturedBlack.map((p, i) => (
                <span key={`b-${i}-${p}`}>{PIECE_SYMBOLS[p] ?? p}</span>
              ))}
              {capturedBlack.length === 0 && '—'}
            </Typography>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Move history
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {moveHistory.map((m, i) => (
                <Typography key={i} variant="caption" display="block">
                  {i + 1}. {m.from} → {m.to}
                </Typography>
              ))}
              {moveHistory.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  —
                </Typography>
              )}
            </Box>
          </Stack>
        </Stack>
      )}
    </MiniGamePlayPageRoot>
  );
};

/**
 * Reversi (Othello): two-player strategy game. Place pieces to capture lines;
 * no valid moves = pass; game ends when neither can move; most pieces wins.
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
  makeReversiMove,
  type ReversiStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import type { GameSession, GameSessionParticipant } from '../../types/games';

const SIZE = 8;
const CELL_SIZE = 40;
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function getBoard(session: GameSession): (string | null)[][] {
  const payload = session.state_payload as ReversiStatePayload | undefined;
  const raw = payload?.board;
  if (Array.isArray(raw) && raw.length === SIZE) {
    return raw.map((row) =>
      Array.isArray(row) && row.length === SIZE
        ? row.map((c) => (c === '' || c === 'X' || c === 'O' ? c : null))
        : Array.from({ length: SIZE }, () => null),
    );
  }
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => null),
  );
}

function getCurrentTurnPosition(session: GameSession): number {
  const payload = session.state_payload as ReversiStatePayload | undefined;
  const p = payload?.currentTurnPosition;
  return p === 0 || p === 1 ? p : 0;
}

function getWinnerPosition(session: GameSession): number | null {
  const payload = session.state_payload as ReversiStatePayload | undefined;
  const w = payload?.winnerPosition;
  return w === 0 || w === 1 ? w : w === -1 ? -1 : null;
}

function getCounts(
  session: GameSession,
  board: (string | null)[][],
): { x: number; o: number } {
  const payload = session.state_payload as ReversiStatePayload | undefined;
  if (
    typeof payload?.countX === 'number' &&
    typeof payload?.countO === 'number'
  ) {
    return { x: payload.countX, o: payload.countO };
  }
  let x = 0;
  let o = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = board[r]?.[c];
      if (cell === 'X') x++;
      else if (cell === 'O') o++;
    }
  }
  return { x, o };
}

function getValidMoves(
  board: (string | null)[][],
  turnPosition: number,
): Set<string> {
  const myMarker = turnPosition === 0 ? 'X' : 'O';
  const oppMarker = turnPosition === 0 ? 'O' : 'X';
  const valid = new Set<string>();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = board[r]?.[c];
      if (cell != null && cell !== '') continue;
      for (const [dr, dc] of DIRECTIONS) {
        let nr = r + dr;
        let nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        if ((board[nr]?.[nc] ?? '') !== oppMarker) continue;
        nr += dr;
        nc += dc;
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          const mid = board[nr]?.[nc] ?? '';
          if (mid === oppMarker) {
            nr += dr;
            nc += dc;
            continue;
          }
          if (mid === myMarker) {
            valid.add(`${r},${c}`);
            break;
          }
          break;
        }
      }
    }
  }
  return valid;
}

function isMyTurn(session: GameSession, myUserId: string): boolean {
  if (
    session.status !== 'active' &&
    session.status !== 'waiting_your_move' &&
    session.status !== 'waiting_opponent_move'
  ) {
    return false;
  }
  const pos = getCurrentTurnPosition(session);
  const participants = (session.participants ?? []) as GameSessionParticipant[];
  const ordered = [...participants].sort(
    (a, b) => (a.turn_order_position ?? 0) - (b.turn_order_position ?? 0),
  );
  const currentPlayerId = ordered[pos]?.user_id ?? null;
  return currentPlayerId === myUserId;
}

export const ReversiPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [makingMove, setMakingMove] = useState(false);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'reversi') {
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
  const myPosition = ordered[0]?.user_id === myUserId ? 0 : 1;
  const board = session
    ? getBoard(session)
    : (Array.from({ length: SIZE }, () =>
        Array.from({ length: SIZE }, () => null),
      ) as (string | null)[][]);
  const turnPos = session ? getCurrentTurnPosition(session) : 0;
  const validMoves = useMemo(
    () => getValidMoves(board, turnPos),
    [board, turnPos],
  );
  const myTurn = session ? isMyTurn(session, myUserId ?? '') : false;
  const completed = session?.status === 'completed';
  const winnerPos = session ? getWinnerPosition(session) : null;
  const counts = session ? getCounts(session, board) : { x: 0, o: 0 };

  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      if (!session?.id || !myUserId) return;
      if (!isMyTurn(session, myUserId) || session.status === 'completed')
        return;
      const board = getBoard(session);
      const turnPos = getCurrentTurnPosition(session);
      const valid = getValidMoves(board, turnPos);
      if (!valid.has(`${row},${col}`)) return;
      setMakingMove(true);
      try {
        await makeReversiMove(session.id, row, col);
        await loadSession(session.id);
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setMakingMove(false);
      }
    },
    [session, myUserId, loadSession, showToast],
  );

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
    const isInvitee = ordered[1]?.user_id === myUserId;
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

  const outcomeMessage =
    completed && winnerPos !== null
      ? winnerPos === -1
        ? "It's a draw."
        : winnerPos === myPosition
          ? 'You won!'
          : 'You lost.'
      : null;

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
          Reversi
        </Typography>
        {!myTurn && !completed && session?.id && (
          <Button
            size="small"
            variant="outlined"
            onClick={refreshSession}
            disabled={makingMove}
          >
            Refresh
          </Button>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, display: 'inline-block' }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, textAlign: 'center' }}
          aria-live="polite"
        >
          {outcomeMessage ??
            (myTurn
              ? 'Your turn (Black: X, White: O)'
              : "Opponent's turn")}{' '}
          · X: {counts.x} · O: {counts.o}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${SIZE}, ${CELL_SIZE}px)`,
            gap: 0.5,
            bgcolor: 'primary.dark',
            p: 0.5,
            borderRadius: 1,
          }}
          role="grid"
          aria-label="Reversi board"
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const piece = cell === 'X' || cell === 'O' ? cell : '';
              const isValid = validMoves.has(`${rowIndex},${colIndex}`);
              const clickable = myTurn && isValid && !completed && !makingMove;
              return (
                <Box
                  key={`${rowIndex}-${colIndex}`}
                  role="gridcell"
                  aria-label={`Row ${rowIndex + 1} col ${colIndex + 1}${
                    piece ? `, ${piece}` : isValid ? ', valid move' : ''
                  }`}
                  component={clickable ? 'button' : 'div'}
                  onClick={
                    clickable
                      ? () => void handleCellClick(rowIndex, colIndex)
                      : undefined
                  }
                  sx={{
                    width: CELL_SIZE - 4,
                    height: CELL_SIZE - 4,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor:
                      isValid && myTurn ? 'primary.light' : 'transparent',
                    bgcolor: piece
                      ? piece === 'X'
                        ? 'grey.900'
                        : 'grey.100'
                      : isValid && myTurn
                        ? 'action.hover'
                        : 'primary.main',
                    boxShadow: piece ? 2 : 0,
                    cursor: clickable ? 'pointer' : 'default',
                    '&:hover': clickable ? { opacity: 0.9 } : undefined,
                  }}
                >
                  {piece ? (
                    <Box
                      sx={{
                        width: '70%',
                        height: '70%',
                        borderRadius: '50%',
                        bgcolor: piece === 'X' ? 'grey.900' : 'grey.100',
                        m: '15%',
                      }}
                    />
                  ) : null}
                </Box>
              );
            }),
          )}
        </Box>

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
              variant="contained"
            >
              Back to Games
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

/**
 * Connect 4: two-player turn-based grid game.
 * Invite a connection from Games; board initializes when invitee accepts.
 * Pieces drop to lowest open slot; horizontal, vertical, diagonal wins and draw.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  fetchSessionForGameType,
  makeConnectFourMove,
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

const ROWS = 6;
const COLS = 7;
const CELL_SIZE = 44;

export type ConnectFourStatePayload = {
  board?: (string | null)[][];
  currentTurnPosition?: number;
  winnerTurnPosition?: number;
  winningLine?: [number, number][];
};

function getBoard(session: GameSession): (string | null)[][] {
  const payload = session.state_payload as ConnectFourStatePayload | undefined;
  const raw = payload?.board;
  if (Array.isArray(raw) && raw.length === ROWS) {
    return raw.map((row) =>
      Array.isArray(row) && row.length === COLS
        ? row.map((c) => (c === '' || c === 'X' || c === 'O' ? c : null))
        : Array.from({ length: COLS }, () => null),
    );
  }
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
}

function getCurrentTurnPosition(session: GameSession): number {
  const payload = session.state_payload as ConnectFourStatePayload | undefined;
  const p = payload?.currentTurnPosition;
  return p === 0 || p === 1 ? p : 0;
}

function getWinningLine(session: GameSession): [number, number][] {
  const payload = session.state_payload as ConnectFourStatePayload | undefined;
  const raw = payload?.winningLine;
  if (!Array.isArray(raw) || raw.length !== 4) return [];
  return raw.filter(
    (cell): cell is [number, number] =>
      Array.isArray(cell) &&
      cell.length === 2 &&
      typeof cell[0] === 'number' &&
      typeof cell[1] === 'number',
  );
}

function getWinnerTurnPosition(session: GameSession): number | null {
  const payload = session.state_payload as ConnectFourStatePayload | undefined;
  const w = payload?.winnerTurnPosition;
  return w === 0 || w === 1 ? w : null;
}

function isColumnFull(board: (string | null)[][], col: number): boolean {
  return board[0]?.[col] != null && board[0][col] !== '';
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

function isWinningCell(
  winningLine: [number, number][],
  row: number,
  col: number,
): boolean {
  return winningLine.some(([r, c]) => r === row && c === col);
}

export const ConnectFourPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [makingMove, setMakingMove] = useState(false);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'connect_four');
    if (!s) {
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
      const uid = authSession?.user?.id ?? null;
      if (!cancelled) setMyUserId(uid);
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

  const handleColumnClick = useCallback(
    async (col: number) => {
      if (!session?.id || !myUserId) return;
      const board = getBoard(session);
      if (isColumnFull(board, col)) return;
      if (!isMyTurn(session, myUserId)) return;
      if (session.status === 'completed') return;
      setMakingMove(true);
      try {
        await makeConnectFourMove(session.id, col);
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
    return <MiniGameLoadingNotFound loading={loading} notFound={notFound} />;
  }

  if (!session) return null;

  const participants = (session.participants ?? []) as GameSessionParticipant[];
  const ordered = [...participants].sort(
    (a, b) => (a.turn_order_position ?? 0) - (b.turn_order_position ?? 0),
  );
  const iAmCreator = ordered[0]?.user_id === myUserId;
  const myPosition = iAmCreator ? 0 : 1;

  if (
    session.status === 'pending_invitation' ||
    session.status === 'declined' ||
    session.status === 'canceled'
  ) {
    const isInvitee = ordered[1]?.user_id === myUserId;
    const message =
      session.status === 'pending_invitation'
        ? isInvitee
          ? "You've been invited to this game. Accept or decline from the Games page."
          : 'Waiting for your connection to accept the invitation.'
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

  const board = getBoard(session);
  const myTurn = isMyTurn(session, myUserId ?? '');
  const completed = session.status === 'completed';
  const result = session.result;
  const winnerPos = getWinnerTurnPosition(session);
  const winningLine = getWinningLine(session);
  const outcomeMessage =
    completed && result === 'winner'
      ? winnerPos === myPosition
        ? 'You won!'
        : 'You lost.'
      : completed && result === 'draw'
        ? "It's a draw."
        : null;

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Connect 4"
        showStats={!myTurn && !completed && !!session?.id}
        stats={
          <Button
            size="small"
            variant="outlined"
            onClick={refreshSession}
            disabled={makingMove}
          >
            Refresh
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2, display: 'inline-block' }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, textAlign: 'center' }}
          aria-live="polite"
        >
          {outcomeMessage ?? (myTurn ? 'Your turn' : "Opponent's turn")}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
            gap: 1,
            bgcolor: 'primary.main',
            p: 1,
            borderRadius: 1,
          }}
          role="grid"
          aria-label="Connect 4 board"
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <Box
                key={`${rowIndex}-${colIndex}`}
                role="gridcell"
                aria-label={
                  cell
                    ? `Row ${rowIndex + 1} column ${colIndex + 1}: ${cell}`
                    : `Row ${rowIndex + 1} column ${colIndex + 1}: empty`
                }
                sx={{
                  width: CELL_SIZE - 4,
                  height: CELL_SIZE - 4,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: isWinningCell(winningLine, rowIndex, colIndex)
                    ? 'success.main'
                    : 'transparent',
                  boxShadow: isWinningCell(winningLine, rowIndex, colIndex)
                    ? 3
                    : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color:
                    cell === 'X'
                      ? 'primary.main'
                      : cell === 'O'
                        ? 'secondary.main'
                        : 'transparent',
                }}
              >
                {cell || ''}
              </Box>
            )),
          )}
        </Box>

        {!completed && (
          <Stack
            direction="row"
            justifyContent="center"
            spacing={0.5}
            sx={{ mt: 1 }}
          >
            {Array.from({ length: COLS }, (_, col) => {
              const full = isColumnFull(board, col);
              return (
                <Button
                  key={col}
                  variant="outlined"
                  size="small"
                  disabled={full || !myTurn || makingMove}
                  onClick={() => void handleColumnClick(col)}
                  aria-label={
                    full
                      ? `Column ${col + 1} full`
                      : `Drop piece in column ${col + 1}`
                  }
                  sx={{ minWidth: CELL_SIZE, minHeight: 36 }}
                >
                  {col + 1}
                </Button>
              );
            })}
          </Stack>
        )}
      </Paper>
    </MiniGamePlayPageRoot>
  );
};

/**
 * Tic-Tac-Toe play surface: two-player turn-based match.
 * Invite a connection from Games dashboard; board initializes when invitee accepts.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  fetchSessionForGameType,
  makeTicTacToeMove,
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

const CELL_SIZE = 64;

export type TttStatePayload = {
  board?: (string | null)[];
  currentTurnPosition?: number;
  winnerTurnPosition?: number;
};

function getBoard(session: GameSession): (string | null)[] {
  const payload = session.state_payload as TttStatePayload | undefined;
  const raw = payload?.board;
  if (Array.isArray(raw) && raw.length === 9) {
    return raw.map((c) => (c === '' || c === 'X' || c === 'O' ? c : null));
  }
  return Array.from({ length: 9 }, () => null);
}

function getCurrentTurnPosition(session: GameSession): number {
  const payload = session.state_payload as TttStatePayload | undefined;
  const p = payload?.currentTurnPosition;
  return p === 0 || p === 1 ? p : 0;
}

function getWinnerTurnPosition(session: GameSession): number | null {
  const payload = session.state_payload as TttStatePayload | undefined;
  const w = payload?.winnerTurnPosition;
  return w === 0 || w === 1 ? w : null;
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

export const TicTacToePlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [makingMove, setMakingMove] = useState(false);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'tic_tac_toe');
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

  const handleCellClick = useCallback(
    async (index: number) => {
      if (!session?.id || !myUserId) return;
      const board = getBoard(session);
      if (board[index]) return;
      if (!isMyTurn(session, myUserId)) return;
      if (session.status === 'completed') return;
      setMakingMove(true);
      try {
        await makeTicTacToeMove(session.id, index);
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
  const isInvitee = ordered[1]?.user_id === myUserId;

  if (
    session.status === 'pending_invitation' ||
    session.status === 'declined' ||
    session.status === 'canceled'
  ) {
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
      <MiniGamePlayHeaderRow title="Tic-Tac-Toe" showStats={false} />

      <Paper variant="outlined" sx={{ p: 2, display: 'inline-block' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            {outcomeMessage ?? (myTurn ? 'Your turn' : "Opponent's turn")}
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0.5,
            width: CELL_SIZE * 3 + 8,
          }}
          role="grid"
          aria-label="Tic-Tac-Toe board"
        >
          {board.map((cell, index) => (
            <Box
              key={index}
              role="gridcell"
              aria-label={
                cell ? `Cell ${index + 1}: ${cell}` : `Cell ${index + 1}: empty`
              }
              onClick={() => void handleCellClick(index)}
              sx={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                border: '2px solid',
                borderColor: 'divider',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 700,
                cursor:
                  completed || cell || !myTurn || makingMove
                    ? 'default'
                    : 'pointer',
                bgcolor:
                  completed || cell || !myTurn || makingMove
                    ? 'action.hover'
                    : 'background.paper',
                '&:hover': {
                  bgcolor:
                    completed || cell || !myTurn || makingMove
                      ? 'action.hover'
                      : 'action.selected',
                },
              }}
            >
              {cell || ''}
            </Box>
          ))}
        </Box>
      </Paper>
    </MiniGamePlayPageRoot>
  );
};

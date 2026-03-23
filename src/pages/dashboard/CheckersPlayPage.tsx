/**
 * Checkers: two-player turn-based. Invite a connection; standard rules:
 * diagonal move/capture, king promotion, mandatory capture, multi-capture continuation.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { fetchSessionById, makeCheckersMove } from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import type { GameSession, GameSessionParticipant } from '../../types/games';
import {
  MiniGameLoadingNotFound,
  MiniGamePlayHeaderRow,
  MiniGamePlayPageRoot,
} from './games/MiniGamePlayChrome';

const SIZE = 8;
const CELL_PX = 42;

export type CheckersStatePayload = {
  board?: string[][];
  currentTurnPosition?: number;
  mustContinueFrom?: [number, number];
  winnerTurnPosition?: number;
};

function getBoard(session: GameSession): string[][] {
  const payload = session.state_payload as CheckersStatePayload | undefined;
  const raw = payload?.board;
  if (Array.isArray(raw) && raw.length === SIZE) {
    return raw.map((row) =>
      Array.isArray(row) && row.length === SIZE
        ? row.map((c) => (typeof c === 'string' ? c : ''))
        : Array.from({ length: SIZE }, () => ''),
    );
  }
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ''),
  );
}

function getCurrentTurnPosition(session: GameSession): number {
  const payload = session.state_payload as CheckersStatePayload | undefined;
  const p = payload?.currentTurnPosition;
  return p === 0 || p === 1 ? p : 0;
}

function getMustContinueFrom(session: GameSession): [number, number] | null {
  const payload = session.state_payload as CheckersStatePayload | undefined;
  const raw = payload?.mustContinueFrom;
  if (
    Array.isArray(raw) &&
    raw.length === 2 &&
    typeof raw[0] === 'number' &&
    typeof raw[1] === 'number'
  ) {
    return [raw[0], raw[1]];
  }
  return null;
}

function getWinnerTurnPosition(session: GameSession): number | null {
  const payload = session.state_payload as CheckersStatePayload | undefined;
  const w = payload?.winnerTurnPosition;
  return w === 0 || w === 1 ? w : null;
}

function isDark(r: number, c: number): boolean {
  return (r + c) % 2 === 1;
}

function isMyPiece(piece: string, turnPosition: number): boolean {
  if (turnPosition === 0) return piece === 'x' || piece === 'X';
  return piece === 'o' || piece === 'O';
}

function isOpponent(piece: string, turnPosition: number): boolean {
  if (turnPosition === 0) return piece === 'o' || piece === 'O';
  return piece === 'x' || piece === 'X';
}

function isKing(piece: string): boolean {
  return piece === 'X' || piece === 'O';
}

function getValidMoves(
  board: string[][],
  turnPosition: number,
  fromR: number,
  fromC: number,
  mustContinueFrom: [number, number] | null,
): [number, number][] {
  const piece = board[fromR]?.[fromC] ?? '';
  if (!isMyPiece(piece, turnPosition)) return [];
  if (
    mustContinueFrom &&
    (fromR !== mustContinueFrom[0] || fromC !== mustContinueFrom[1])
  )
    return [];

  const king = isKing(piece);
  const dirs: [number, number][] = king
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : turnPosition === 0
      ? [
          [-1, -1],
          [-1, 1],
        ]
      : [
          [1, -1],
          [1, 1],
        ];
  const jumps: [number, number][] = [];
  const steps: [number, number][] = [];

  for (const [dr, dc] of dirs) {
    const stepR = fromR + dr;
    const stepC = fromC + dc;
    if (
      stepR >= 0 &&
      stepR < SIZE &&
      stepC >= 0 &&
      stepC < SIZE &&
      isDark(stepR, stepC)
    ) {
      const stepPiece = board[stepR]?.[stepC] ?? '';
      if (stepPiece === '') {
        steps.push([stepR, stepC]);
      } else if (isOpponent(stepPiece, turnPosition)) {
        const jumpR = fromR + 2 * dr;
        const jumpC = fromC + 2 * dc;
        if (
          jumpR >= 0 &&
          jumpR < SIZE &&
          jumpC >= 0 &&
          jumpC < SIZE &&
          isDark(jumpR, jumpC)
        ) {
          if ((board[jumpR]?.[jumpC] ?? '') === '') jumps.push([jumpR, jumpC]);
        }
      }
    }
  }

  const anyJump = (() => {
    if (jumps.length > 0) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r]?.[c] ?? '';
        if (!isMyPiece(p, turnPosition)) continue;
        if (
          mustContinueFrom &&
          (r !== mustContinueFrom[0] || c !== mustContinueFrom[1])
        )
          continue;
        const k = isKing(p);
        const d: [number, number][] = k
          ? [
              [-1, -1],
              [-1, 1],
              [1, -1],
              [1, 1],
            ]
          : turnPosition === 0
            ? [
                [-1, -1],
                [-1, 1],
              ]
            : [
                [1, -1],
                [1, 1],
              ];
        for (const [dr, dc] of d) {
          const mr = r + dr;
          const mc = c + dc;
          const jr = r + 2 * dr;
          const jc = c + 2 * dc;
          if (
            jr >= 0 &&
            jr < SIZE &&
            jc >= 0 &&
            jc < SIZE &&
            isDark(jr, jc) &&
            isOpponent(board[mr]?.[mc] ?? '', turnPosition) &&
            (board[jr]?.[jc] ?? '') === ''
          ) {
            return true;
          }
        }
      }
    }
    return false;
  })();

  if (anyJump) return jumps;
  return steps;
}

function isMyTurn(session: GameSession, myUserId: string): boolean {
  if (
    session.status !== 'active' &&
    session.status !== 'waiting_your_move' &&
    session.status !== 'waiting_opponent_move'
  )
    return false;
  const pos = getCurrentTurnPosition(session);
  const participants = (session.participants ?? []) as GameSessionParticipant[];
  const ordered = [...participants].sort(
    (a, b) => (a.turn_order_position ?? 0) - (b.turn_order_position ?? 0),
  );
  return ordered[pos]?.user_id === myUserId;
}

export const CheckersPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [makingMove, setMakingMove] = useState(false);
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'checkers') {
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

  const board = useMemo(() => (session ? getBoard(session) : []), [session]);
  const turnPosition = session ? getCurrentTurnPosition(session) : 0;
  const mustContinueFrom = session ? getMustContinueFrom(session) : null;
  const validTargets = useMemo(() => {
    if (!selected || !session) return [];
    return getValidMoves(
      board,
      turnPosition,
      selected[0],
      selected[1],
      mustContinueFrom,
    );
  }, [session, board, turnPosition, selected, mustContinueFrom]);

  const handleCellClick = useCallback(
    async (r: number, c: number) => {
      if (!session?.id || !myUserId) return;
      if (session.status === 'completed') return;
      const piece = board[r]?.[c] ?? '';
      const myTurn = isMyTurn(session, myUserId);

      if (selected) {
        const isTarget = validTargets.some(([tr, tc]) => tr === r && tc === c);
        if (isTarget) {
          setMakingMove(true);
          try {
            await makeCheckersMove(session.id, selected[0], selected[1], r, c);
            setSelected(null);
            await loadSession(session.id);
          } catch (e) {
            showToast({ message: toMessage(e), severity: 'error' });
          } finally {
            setMakingMove(false);
          }
          return;
        }
        setSelected(null);
      }

      if (!myTurn) return;
      if (!isDark(r, c)) return;
      if (isMyPiece(piece, turnPosition)) {
        const moves = getValidMoves(
          board,
          turnPosition,
          r,
          c,
          mustContinueFrom,
        );
        if (moves.length > 0) setSelected([r, c]);
      }
    },
    [
      session,
      board,
      turnPosition,
      mustContinueFrom,
      selected,
      validTargets,
      myUserId,
      loadSession,
      showToast,
    ],
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
  const completed = session.status === 'completed';
  const winnerPos = getWinnerTurnPosition(session);
  const outcomeMessage =
    completed && winnerPos !== null
      ? winnerPos === myPosition
        ? 'You won!'
        : 'You lost.'
      : null;

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
          <Typography sx={{ mb: 2 }}>{message}</Typography>
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

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Checkers"
        showStats={
          !isMyTurn(session, myUserId ?? '') && !completed && !!session?.id
        }
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

      <Paper variant="outlined" sx={{ p: 1, display: 'inline-block' }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, textAlign: 'center' }}
          aria-live="polite"
        >
          {outcomeMessage ??
            (isMyTurn(session, myUserId ?? '')
              ? 'Your turn'
              : "Opponent's turn")}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, ${CELL_PX}px)`,
            gridTemplateRows: `repeat(${SIZE}, ${CELL_PX}px)`,
            gap: 0,
          }}
          role="grid"
          aria-label="Checkers board"
        >
          {Array.from({ length: SIZE }, (_, r) =>
            Array.from({ length: SIZE }, (_, c) => {
              const dark = isDark(r, c);
              const piece = board[r]?.[c] ?? '';
              const isSelected =
                selected !== null && selected[0] === r && selected[1] === c;
              const isValidTarget = validTargets.some(
                ([tr, tc]) => tr === r && tc === c,
              );
              return (
                <Box
                  key={`${r}-${c}`}
                  role="gridcell"
                  aria-label={
                    dark
                      ? piece
                        ? `Row ${r + 1} col ${c + 1}: ${piece === 'X' || piece === 'O' ? 'king' : 'piece'}`
                        : `Row ${r + 1} col ${c + 1}: empty`
                      : 'light square'
                  }
                  onClick={() => dark && void handleCellClick(r, c)}
                  sx={{
                    width: CELL_PX,
                    height: CELL_PX,
                    bgcolor: dark
                      ? isSelected
                        ? 'primary.dark'
                        : isValidTarget
                          ? 'action.selected'
                          : 'grey.700'
                      : 'grey.400',
                    cursor:
                      dark &&
                      (piece
                        ? isMyPiece(piece, turnPosition) || isValidTarget
                        : isValidTarget)
                        ? 'pointer'
                        : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 0,
                    border: isSelected ? '3px solid' : '1px solid',
                    borderColor: isSelected ? 'primary.light' : 'transparent',
                  }}
                >
                  {piece && (
                    <Box
                      sx={{
                        width: CELL_PX - 12,
                        height: CELL_PX - 12,
                        borderRadius: '50%',
                        bgcolor:
                          piece === 'x' || piece === 'X'
                            ? 'primary.main'
                            : 'secondary.main',
                        border: '2px solid',
                        borderColor: 'grey.300',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {(piece === 'X' || piece === 'O') && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: 'primary.contrastText',
                          }}
                        >
                          K
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              );
            }),
          )}
        </Box>
      </Paper>
    </MiniGamePlayPageRoot>
  );
};

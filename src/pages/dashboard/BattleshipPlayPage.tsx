/**
 * Battleship: two-player. Invite a connection; each places ships (5,4,3,3,2);
 * then alternate firing at coordinates. Hits/misses recorded; fleet destroyed ends game.
 */
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  fetchSessionForGameType,
  fireBattleship,
  placeBattleshipShips,
  type BattleshipShip,
  type BattleshipStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { useGameSessionRealtime } from '../../hooks/useGameSessionRealtime';
import type { GameSession, GameSessionParticipant } from '../../types/games';
import {
  getMiniGameSessionUnavailableMessage,
  MiniGameLoadingNotFound,
  MiniGamePlayHeaderRow,
  MiniGamePlayPageRoot,
  MiniGameSessionUnavailableScreen,
} from './games/MiniGamePlayChrome';

const BOARD_SIZE = 10;
const CELL_PX = 32;
const SHIP_LENGTHS = [5, 4, 3, 3, 2] as const;
const SHIP_NAMES = [
  'Carrier',
  'Battleship',
  'Cruiser',
  'Submarine',
  'Destroyer',
];

function getState(session: GameSession): BattleshipStatePayload {
  const raw = session.state_payload as BattleshipStatePayload | undefined;
  return {
    phase: raw?.phase ?? 'placing',
    creatorShips: Array.isArray(raw?.creatorShips) ? raw.creatorShips : [],
    inviteeShips: Array.isArray(raw?.inviteeShips) ? raw.inviteeShips : [],
    creatorShots: Array.isArray(raw?.creatorShots) ? raw.creatorShots : [],
    inviteeShots: Array.isArray(raw?.inviteeShots) ? raw.inviteeShots : [],
    currentTurnPosition: raw?.currentTurnPosition ?? 0,
    winnerPosition: raw?.winnerPosition,
  };
}

function isAdjacent(a: [number, number], b: [number, number]): boolean {
  return (
    (Math.abs(a[0] - b[0]) === 1 && a[1] === b[1]) ||
    (Math.abs(a[1] - b[1]) === 1 && a[0] === b[0])
  );
}

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function shotAt(
  shots: { r: number; c: number; hit: boolean }[],
  r: number,
  c: number,
): boolean {
  return shots.some((s) => s.r === r && s.c === c);
}

function hitAt(
  shots: { r: number; c: number; hit: boolean }[],
  r: number,
  c: number,
): boolean {
  const s = shots.find((x) => x.r === r && x.c === c);
  return s?.hit ?? false;
}

function shipAt(ships: BattleshipShip[], r: number, c: number): boolean {
  return ships.some((ship) =>
    ship.positions.some(([pr, pc]) => pr === r && pc === c),
  );
}

export const BattleshipPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [firing, setFiring] = useState(false);
  const [placingShips, setPlacingShips] = useState<BattleshipShip[]>([]);
  const [currentShipCells, setCurrentShipCells] = useState<[number, number][]>(
    [],
  );

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'battleship');
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

  const currentShipIndex = placingShips.length;
  const currentShipLength = SHIP_LENGTHS[currentShipIndex] ?? 0;
  const allPlaced = currentShipIndex >= 5;

  const handlePlacementCellClick = useCallback(
    (r: number, c: number) => {
      if (allPlaced) return;
      const cell: [number, number] = [r, c];
      const used = new Set<string>();
      placingShips.forEach((s) =>
        s.positions.forEach(([pr, pc]) => used.add(cellKey(pr, pc))),
      );
      currentShipCells.forEach(([pr, pc]) => used.add(cellKey(pr, pc)));
      if (used.has(cellKey(r, c))) {
        const idx = currentShipCells.findIndex(
          ([pr, pc]) => pr === r && pc === c,
        );
        if (idx >= 0 && idx === currentShipCells.length - 1) {
          setCurrentShipCells((prev) => prev.slice(0, -1));
        }
        return;
      }
      if (currentShipCells.length === 0) {
        setCurrentShipCells([cell]);
        return;
      }
      const last = currentShipCells[currentShipCells.length - 1];
      if (!isAdjacent(last, cell)) return;
      if (currentShipCells.length + 1 === currentShipLength) {
        setPlacingShips((prev) => [
          ...prev,
          {
            id: String(currentShipIndex),
            positions: [...currentShipCells, cell],
          },
        ]);
        setCurrentShipCells([]);
      } else {
        setCurrentShipCells((prev) => [...prev, cell]);
      }
    },
    [
      allPlaced,
      currentShipCells,
      currentShipIndex,
      currentShipLength,
      placingShips,
    ],
  );

  const handleClearCurrentShip = useCallback(() => {
    setCurrentShipCells([]);
  }, []);

  const handleUndoLastShip = useCallback(() => {
    if (placingShips.length > 0) {
      setPlacingShips((prev) => prev.slice(0, -1));
      setCurrentShipCells([]);
    }
  }, [placingShips.length]);

  const handleSubmitPlacement = useCallback(async () => {
    if (!session?.id || placingShips.length !== 5 || placing) return;
    setPlacing(true);
    try {
      await placeBattleshipShips(session.id, placingShips);
      await loadSession(session.id);
      setPlacingShips([]);
      setCurrentShipCells([]);
      showToast({ message: 'Fleet placed.', severity: 'success' });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setPlacing(false);
    }
  }, [session, placingShips, placing, loadSession, showToast]);

  const handleFire = useCallback(
    async (r: number, c: number) => {
      if (!session?.id || firing) return;
      setFiring(true);
      try {
        await fireBattleship(session.id, r, c);
        await loadSession(session.id);
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setFiring(false);
      }
    },
    [session, firing, loadSession, showToast],
  );

  if (loading || notFound) {
    return <MiniGameLoadingNotFound loading={loading} notFound={notFound} />;
  }

  if (!session) return null;

  const participants = (session.participants ?? []) as GameSessionParticipant[];
  const ordered = [...participants].sort(
    (a, b) => (a.turn_order_position ?? 0) - (b.turn_order_position ?? 0),
  );
  const myPosition = ordered[0]?.user_id === myUserId ? 0 : 1;
  const state = getState(session);
  const phase = state.phase ?? 'placing';
  const completed = session.status === 'completed' || phase === 'completed';

  const isInvitee = ordered[1]?.user_id === myUserId;
  const unavailableMsg = getMiniGameSessionUnavailableMessage(
    session,
    isInvitee,
    {
      inviteePending:
        "You've been invited. Accept or decline from the Games page.",
      hostPending: 'Waiting for your connection to accept.',
    },
  );
  if (unavailableMsg != null) {
    return <MiniGameSessionUnavailableScreen message={unavailableMsg} />;
  }

  const myShips =
    myPosition === 0 ? (state.creatorShips ?? []) : (state.inviteeShips ?? []);
  const opponentShips =
    myPosition === 0 ? (state.inviteeShips ?? []) : (state.creatorShips ?? []);
  const myShots =
    myPosition === 0 ? (state.creatorShots ?? []) : (state.inviteeShots ?? []);
  const opponentShots =
    myPosition === 0 ? (state.inviteeShots ?? []) : (state.creatorShots ?? []);
  const myTurn = !completed && (state.currentTurnPosition ?? 0) === myPosition;

  const myBoardUsed = new Set<string>();
  myShips.forEach((s) =>
    s.positions.forEach(([r, c]) => myBoardUsed.add(cellKey(r, c))),
  );
  currentShipCells.forEach(([r, c]) => myBoardUsed.add(cellKey(r, c)));
  placingShips.forEach((s) =>
    s.positions.forEach(([r, c]) => myBoardUsed.add(cellKey(r, c))),
  );

  const renderGrid = (options: {
    label: string;
    showShips: boolean;
    ships: BattleshipShip[];
    shots: { r: number; c: number; hit: boolean }[];
    onClick?: (r: number, c: number) => void;
    clickable?: (r: number, c: number) => boolean;
    placingCells?: [number, number][];
    placingShipsLocal?: BattleshipShip[];
  }) => {
    const {
      label,
      showShips,
      ships,
      shots,
      onClick,
      clickable,
      placingCells = [],
      placingShipsLocal = [],
    } = options;
    const placingSet = new Set(placingCells.map(([r, c]) => cellKey(r, c)));
    const allShips = [...ships, ...placingShipsLocal];
    return (
      <Paper variant="outlined" sx={{ p: 1, display: 'inline-block' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_PX}px)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_PX}px)`,
            gap: 0.5,
          }}
          role="grid"
          aria-label={label}
        >
          {Array.from({ length: BOARD_SIZE }, (_, r) =>
            Array.from({ length: BOARD_SIZE }, (_, c) => {
              const hasShip = showShips && shipAt(allShips, r, c);
              const isShot = shotAt(shots, r, c);
              const isHit = hitAt(shots, r, c);
              const isPlacing = placingSet.has(cellKey(r, c));
              const canClick = clickable?.(r, c) ?? false;
              return (
                <Box
                  key={`${r}-${c}`}
                  role="gridcell"
                  aria-label={`${label} row ${r + 1} col ${c + 1}${
                    hasShip ? ', ship' : ''
                  }${isShot ? (isHit ? ', hit' : ', miss') : ''}`}
                  component={onClick ? 'button' : 'div'}
                  onClick={
                    onClick && canClick ? () => onClick(r, c) : undefined
                  }
                  sx={{
                    width: CELL_PX - 2,
                    height: CELL_PX - 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0.5,
                    bgcolor: isPlacing
                      ? 'primary.light'
                      : hasShip && showShips
                        ? 'primary.main'
                        : isShot
                          ? isHit
                            ? 'error.main'
                            : 'action.hover'
                          : 'background.paper',
                    cursor: canClick ? 'pointer' : 'default',
                    pointerEvents: canClick ? 'auto' : 'none',
                    '&:hover': canClick ? { opacity: 0.9 } : undefined,
                  }}
                />
              );
            }),
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Battleship"
        showStats={!completed && !!session?.id}
        stats={
          <Button
            size="small"
            variant="outlined"
            onClick={refreshSession}
            disabled={placing || firing}
          >
            Refresh
          </Button>
        }
      />

      {phase === 'placing' && (
        <>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
            aria-live="polite"
          >
            {myShips.length === 5
              ? state.creatorShips?.length === 5 &&
                state.inviteeShips?.length === 5
                ? 'Both fleets placed. Starting soon…'
                : 'Waiting for opponent to place their fleet.'
              : `Place your fleet. Current: ${SHIP_NAMES[currentShipIndex]} (${currentShipLength} cells). Click adjacent cells.`}
          </Typography>
          {myShips.length < 5 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleClearCurrentShip}
                disabled={currentShipCells.length === 0}
              >
                Clear current ship
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleUndoLastShip}
                disabled={placingShips.length === 0}
              >
                Undo last ship
              </Button>
            </Stack>
          )}
          {myShips.length < 5 &&
            renderGrid({
              label: 'Your fleet (place ships)',
              showShips: true,
              ships: myShips,
              shots: [],
              onClick: handlePlacementCellClick,
              clickable: () => !allPlaced,
              placingCells: currentShipCells,
              placingShipsLocal: placingShips,
            })}
          {myShips.length === 5 && (
            <>
              {renderGrid({
                label: 'Your fleet',
                showShips: true,
                ships: myShips,
                shots: opponentShots,
              })}
              {state.creatorShips?.length === 5 &&
              state.inviteeShips?.length === 5 ? (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Both fleets placed.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={refreshSession}
                  >
                    Refresh to start
                  </Button>
                </Stack>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Waiting for opponent to place their fleet.
                </Typography>
              )}
            </>
          )}
          {placingShips.length === 5 && myShips.length < 5 && (
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              disabled={placing}
              onClick={() => void handleSubmitPlacement()}
            >
              Place fleet
            </Button>
          )}
        </>
      )}

      {phase === 'playing' && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          alignItems="flex-start"
        >
          {renderGrid({
            label: 'Your fleet',
            showShips: true,
            ships: myShips,
            shots: opponentShots,
          })}
          <Box>
            {renderGrid({
              label: 'Target',
              showShips: false,
              ships: [],
              shots: myShots,
              onClick: handleFire,
              clickable: (r, c) => myTurn && !firing && !shotAt(myShots, r, c),
            })}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
              aria-live="polite"
            >
              {completed
                ? 'Game over.'
                : myTurn
                  ? 'Your turn – click a cell to fire.'
                  : "Opponent's turn."}
            </Typography>
          </Box>
        </Stack>
      )}

      {completed && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {state.winnerPosition === myPosition
              ? 'You won!'
              : 'You lost. Your fleet was destroyed.'}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            {renderGrid({
              label: 'Your fleet',
              showShips: true,
              ships: myShips,
              shots: opponentShots,
            })}
            {renderGrid({
              label: 'Opponent fleet',
              showShips: true,
              ships: opponentShips,
              shots: myShots,
            })}
          </Stack>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Back to Games
          </Button>
        </Paper>
      )}
    </MiniGamePlayPageRoot>
  );
};

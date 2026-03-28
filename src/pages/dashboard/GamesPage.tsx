/**
 * Games dashboard: Game Session Framework surface.
 * Pending invitations, waiting on you, waiting on others, active, completed.
 * Start solo or multiplayer (invite connection).
 */
import AddIcon from '@mui/icons-material/Add';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameSessions } from '../../hooks/useGameSessions';
import {
  acceptInvitation,
  create2048Session,
  createHangmanSession,
  createSnakeSession,
  createSlotsSession,
  createSoloSession,
  createMultiplayerSessionWithInvite,
  createTriviaSoloSession,
  createTriviaMultiplayerSession,
  createTwoTruthsLieSession,
  createWouldYouRatherSession,
  createDartsSoloSession,
  createDartsMultiplayerSession,
  createCaptionGameSession,
  createWordSearchSession,
  createBattleshipSession,
  createReversiSession,
  createBreakoutSession,
  createScrabbleSession,
  createTetrisSession,
  createMazeChaseSession,
  createChessSession,
  createBlackjackSession,
  createPoolSession,
  getOrCreateDailyWordSession,
  declineInvitation,
  fetchSessionById,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import {
  getGameName,
  getProfileLabel,
  getResultForUser,
  getSessionPeerSummary,
} from '../../lib/games/socialSummary';
import { toMessage } from '../../lib/utils/errors';
import type {
  GameDefinition,
  GameInvitation,
  GameSession,
} from '../../types/games';

const SECTION_TITLE_SX = {
  fontWeight: 700,
  letterSpacing: 1,
  color: 'text.secondary',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  mb: 1,
} as const;

function getGameType(session: GameSession): string | undefined {
  return (session.game_definition as { game_type?: string } | undefined)
    ?.game_type;
}

export const GamesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionIdFromUrl = searchParams.get('session');
  const {
    currentUserId,
    definitions,
    sessions,
    sessionsById,
    pendingInvitations,
    waitingOnYou,
    waitingOnOthers,
    activeSolo,
    completed,
    connections,
    profilesById,
    loading,
    error,
    refresh,
  } = useGameSessions();
  const { showToast } = useAppToast();
  const [startOpen, setStartOpen] = useState(false);
  const [selectedDef, setSelectedDef] = useState<GameDefinition | null>(null);
  const [resumeSession, setResumeSession] = useState<GameSession | null>(null);
  const [actingInvitationId, setActingInvitationId] = useState<string | null>(
    null,
  );

  const getInvitationPrimary = useCallback(
    (invitation: GameInvitation) => {
      const session = sessionsById[invitation.session_id];
      return `${session ? getGameName(session) : 'Game'} invite from ${getProfileLabel(invitation.sender_id, profilesById, currentUserId)}`;
    },
    [currentUserId, profilesById, sessionsById],
  );

  const getInvitationSecondary = useCallback(
    (invitation: GameInvitation) => {
      const session = sessionsById[invitation.session_id];
      if (!session) return `Session ${invitation.session_id.slice(0, 8)}…`;
      return `${getSessionPeerSummary(session, currentUserId, profilesById)} · Waiting for your response`;
    },
    [currentUserId, profilesById, sessionsById],
  );

  const getSessionSecondary = useCallback(
    (
      session: GameSession,
      mode: 'waiting_you' | 'waiting_others' | 'solo' | 'completed',
    ) => {
      const peerSummary = getSessionPeerSummary(
        session,
        currentUserId,
        profilesById,
      );
      if (mode === 'waiting_you') {
        return `${peerSummary} · Your move`;
      }
      if (mode === 'waiting_others') {
        if (session.status === 'waiting_players') {
          return `${peerSummary} · Waiting for players to join`;
        }
        return `${peerSummary} · Waiting on someone else`;
      }
      if (mode === 'solo') {
        return `Started ${new Date(session.created_at).toLocaleDateString()}`;
      }
      return `${peerSummary} · Result: ${session.result ?? '—'}`;
    },
    [currentUserId, profilesById],
  );

  useEffect(() => {
    if (!sessionIdFromUrl) return;
    let cancelled = false;
    fetchSessionById(sessionIdFromUrl).then((s) => {
      if (cancelled || !s) return;
      if (getGameType(s) === 'phuzzle') {
        navigate(`/dashboard/games/phuzzle/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'tic_tac_toe') {
        navigate(`/dashboard/games/tic-tac-toe/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'hangman') {
        navigate(`/dashboard/games/hangman/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'connect_four') {
        navigate(`/dashboard/games/connect-four/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'snake') {
        navigate(`/dashboard/games/snake/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'slots') {
        navigate(`/dashboard/games/slots/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'checkers') {
        navigate(`/dashboard/games/checkers/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'trivia') {
        navigate(`/dashboard/games/trivia/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === '2048') {
        navigate(`/dashboard/games/2048/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'two_truths_lie') {
        navigate(`/dashboard/games/two-truths-lie/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'would_you_rather') {
        navigate(`/dashboard/games/would-you-rather/${s.id}`, {
          replace: true,
        });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'darts') {
        navigate(`/dashboard/games/darts/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'caption_game') {
        navigate(`/dashboard/games/caption-game/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'word_search') {
        navigate(`/dashboard/games/word-search/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'battleship') {
        navigate(`/dashboard/games/battleship/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'reversi') {
        navigate(`/dashboard/games/reversi/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'breakout') {
        navigate(`/dashboard/games/breakout/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'scrabble') {
        navigate(`/dashboard/games/scrabble/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'tetris') {
        navigate(`/dashboard/games/tetris/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'maze_chase') {
        navigate(`/dashboard/games/maze-chase/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'chess') {
        navigate(`/dashboard/games/chess/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'blackjack') {
        navigate(`/dashboard/games/blackjack/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'pool') {
        navigate(`/dashboard/games/pool/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      if (getGameType(s) === 'daily_word') {
        navigate(`/dashboard/games/daily-word/${s.id}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
      setResumeSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionIdFromUrl, navigate, setSearchParams]);

  const handleAccept = useCallback(
    async (inv: GameInvitation) => {
      setActingInvitationId(inv.id);
      try {
        await acceptInvitation(inv.id);
        showToast({
          message: 'Invitation accepted. Game started.',
          severity: 'success',
        });
        void refresh();
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setActingInvitationId(null);
      }
    },
    [showToast, refresh],
  );

  const handleDecline = useCallback(
    async (inv: GameInvitation) => {
      setActingInvitationId(inv.id);
      try {
        await declineInvitation(inv.id);
        showToast({ message: 'Invitation declined.', severity: 'info' });
        void refresh();
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setActingInvitationId(null);
      }
    },
    [showToast, refresh],
  );

  const handleStartSolo = useCallback(
    async (def: GameDefinition) => {
      try {
        if (def.game_type === 'hangman') {
          const session = await createHangmanSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/hangman/${session.id}`);
          return;
        }
        if (def.game_type === 'snake') {
          const session = await createSnakeSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/snake/${session.id}`);
          return;
        }
        if (def.game_type === 'slots') {
          const session = await createSlotsSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/slots/${session.id}`);
          return;
        }
        if (def.game_type === 'trivia') {
          const session = await createTriviaSoloSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/trivia/${session.id}`);
          return;
        }
        if (def.game_type === '2048') {
          const session = await create2048Session();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/2048/${session.id}`);
          return;
        }
        if (def.game_type === 'darts') {
          const session = await createDartsSoloSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/darts/${session.id}`);
          return;
        }
        if (def.game_type === 'word_search') {
          const session = await createWordSearchSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/word-search/${session.id}`);
          return;
        }
        if (def.game_type === 'breakout') {
          const session = await createBreakoutSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/breakout/${session.id}`);
          return;
        }
        if (def.game_type === 'tetris') {
          const session = await createTetrisSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/tetris/${session.id}`);
          return;
        }
        if (def.game_type === 'maze_chase') {
          const session = await createMazeChaseSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/maze-chase/${session.id}`);
          return;
        }
        if (def.game_type === 'blackjack') {
          const session = await createBlackjackSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/blackjack/${session.id}`);
          return;
        }
        if (def.game_type === 'pool') {
          const session = await createPoolSession();
          showToast({ message: `${def.name} started.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/pool/${session.id}`);
          return;
        }
        if (def.game_type === 'daily_word') {
          const session = await getOrCreateDailyWordSession();
          showToast({ message: `Today's puzzle ready.`, severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/daily-word/${session.id}`);
          return;
        }
        const session = await createSoloSession(def.id, {
          started_at: new Date().toISOString(),
        });
        showToast({ message: `${def.name} started.`, severity: 'success' });
        setStartOpen(false);
        setSelectedDef(null);
        if (def.game_type === 'phuzzle') {
          navigate(`/dashboard/games/phuzzle/${session.id}`);
          return;
        }
        void refresh();
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      }
    },
    [showToast, refresh, navigate],
  );

  const handleStartMultiplayer = useCallback(
    async (def: GameDefinition, connectionId: string) => {
      try {
        if (def.game_type === 'trivia') {
          const { session } = await createTriviaMultiplayerSession([
            connectionId,
          ]);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/trivia/${session.id}`);
          void refresh();
          return;
        }
        if (def.game_type === 'two_truths_lie') {
          const { session } = await createTwoTruthsLieSession([connectionId]);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/two-truths-lie/${session.id}`);
          void refresh();
          return;
        }
        if (def.game_type === 'would_you_rather') {
          const { session } = await createWouldYouRatherSession([connectionId]);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/would-you-rather/${session.id}`);
          void refresh();
          return;
        }
        if (def.game_type === 'darts') {
          const { session } = await createDartsMultiplayerSession([
            connectionId,
          ]);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/darts/${session.id}`);
          void refresh();
          return;
        }
        if (def.game_type === 'caption_game') {
          const { session } = await createCaptionGameSession([connectionId]);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/caption-game/${session.id}`);
          void refresh();
          return;
        }
        if (def.game_type === 'battleship') {
          const { session } = await createBattleshipSession(connectionId);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/battleship/${session.id}`);
          void refresh();
          return;
        }
        if (def.game_type === 'reversi') {
          const { session } = await createReversiSession(connectionId);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/reversi/${session.id}`);
          void refresh();
          return;
        }
        if (def.game_type === 'chess') {
          const { session } = await createChessSession(connectionId);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/chess/${session.id}`);
          void refresh();
          return;
        }
        if (def.game_type === 'scrabble') {
          const { session } = await createScrabbleSession([connectionId]);
          showToast({ message: 'Invitation sent.', severity: 'success' });
          setStartOpen(false);
          setSelectedDef(null);
          navigate(`/dashboard/games/scrabble/${session.id}`);
          void refresh();
          return;
        }
        await createMultiplayerSessionWithInvite(def.id, connectionId, {});
        showToast({ message: `Invitation sent.`, severity: 'success' });
        setStartOpen(false);
        setSelectedDef(null);
        void refresh();
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      }
    },
    [showToast, refresh, navigate],
  );

  const openSession = useCallback(
    (s: GameSession) => {
      if (getGameType(s) === 'phuzzle') {
        navigate(`/dashboard/games/phuzzle/${s.id}`);
        return;
      }
      if (getGameType(s) === 'tic_tac_toe') {
        navigate(`/dashboard/games/tic-tac-toe/${s.id}`);
        return;
      }
      if (getGameType(s) === 'hangman') {
        navigate(`/dashboard/games/hangman/${s.id}`);
        return;
      }
      if (getGameType(s) === 'connect_four') {
        navigate(`/dashboard/games/connect-four/${s.id}`);
        return;
      }
      if (getGameType(s) === 'snake') {
        navigate(`/dashboard/games/snake/${s.id}`);
        return;
      }
      if (getGameType(s) === 'slots') {
        navigate(`/dashboard/games/slots/${s.id}`);
        return;
      }
      if (getGameType(s) === 'checkers') {
        navigate(`/dashboard/games/checkers/${s.id}`);
        return;
      }
      if (getGameType(s) === 'trivia') {
        navigate(`/dashboard/games/trivia/${s.id}`);
        return;
      }
      if (getGameType(s) === '2048') {
        navigate(`/dashboard/games/2048/${s.id}`);
        return;
      }
      if (getGameType(s) === 'two_truths_lie') {
        navigate(`/dashboard/games/two-truths-lie/${s.id}`);
        return;
      }
      if (getGameType(s) === 'would_you_rather') {
        navigate(`/dashboard/games/would-you-rather/${s.id}`);
        return;
      }
      if (getGameType(s) === 'darts') {
        navigate(`/dashboard/games/darts/${s.id}`);
        return;
      }
      if (getGameType(s) === 'caption_game') {
        navigate(`/dashboard/games/caption-game/${s.id}`);
        return;
      }
      if (getGameType(s) === 'word_search') {
        navigate(`/dashboard/games/word-search/${s.id}`);
        return;
      }
      if (getGameType(s) === 'battleship') {
        navigate(`/dashboard/games/battleship/${s.id}`);
        return;
      }
      if (getGameType(s) === 'reversi') {
        navigate(`/dashboard/games/reversi/${s.id}`);
        return;
      }
      if (getGameType(s) === 'breakout') {
        navigate(`/dashboard/games/breakout/${s.id}`);
        return;
      }
      if (getGameType(s) === 'scrabble') {
        navigate(`/dashboard/games/scrabble/${s.id}`);
        return;
      }
      if (getGameType(s) === 'tetris') {
        navigate(`/dashboard/games/tetris/${s.id}`);
        return;
      }
      if (getGameType(s) === 'maze_chase') {
        navigate(`/dashboard/games/maze-chase/${s.id}`);
        return;
      }
      if (getGameType(s) === 'chess') {
        navigate(`/dashboard/games/chess/${s.id}`);
        return;
      }
      if (getGameType(s) === 'blackjack') {
        navigate(`/dashboard/games/blackjack/${s.id}`);
        return;
      }
      if (getGameType(s) === 'pool') {
        navigate(`/dashboard/games/pool/${s.id}`);
        return;
      }
      if (getGameType(s) === 'daily_word') {
        navigate(`/dashboard/games/daily-word/${s.id}`);
        return;
      }
      setSearchParams({ session: s.id });
    },
    [navigate, setSearchParams],
  );

  const dailyChallengeCards = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const challengeOrder = ['daily_word', 'hangman', '2048'];
    return challengeOrder
      .map((gameType) =>
        definitions.find((definition) => definition.game_type === gameType),
      )
      .filter((definition): definition is GameDefinition => Boolean(definition))
      .map((definition) => {
        const relevantSessions = sessions.filter(
          (session) =>
            (session.game_definition as { game_type?: string } | undefined)
              ?.game_type === definition.game_type,
        );
        const completedToday = relevantSessions.some(
          (session) =>
            session.status === 'completed' &&
            session.updated_at.slice(0, 10) === today,
        );
        const activeSession =
          relevantSessions.find((session) => session.status !== 'completed') ??
          null;
        return {
          definition,
          completedToday,
          activeSession,
        };
      });
  }, [definitions, sessions]);

  const rivalryCards = useMemo(() => {
    const rivalryMap = new Map<
      string,
      {
        opponentId: string;
        gameType: string;
        gameName: string;
        wins: number;
        losses: number;
        draws: number;
        latestSession: GameSession;
      }
    >();
    sessions
      .filter((session) => session.status === 'completed')
      .forEach((session) => {
        const participants = (session.participants ?? []).filter(
          (participant) => participant.acceptance_state === 'accepted',
        );
        if (participants.length !== 2 || !currentUserId) return;
        const opponent = participants.find(
          (participant) => participant.user_id !== currentUserId,
        );
        if (!opponent) return;
        const gameType =
          (session.game_definition as { game_type?: string } | undefined)
            ?.game_type ?? 'game';
        const key = `${opponent.user_id}:${gameType}`;
        const result = getResultForUser(session, currentUserId);
        const existing = rivalryMap.get(key);
        const base = existing ?? {
          opponentId: opponent.user_id,
          gameType,
          gameName: getGameName(session),
          wins: 0,
          losses: 0,
          draws: 0,
          latestSession: session,
        };
        if (
          !existing ||
          session.updated_at > existing.latestSession.updated_at
        ) {
          base.latestSession = session;
        }
        if (result === 'win') base.wins += 1;
        if (result === 'loss') base.losses += 1;
        if (result === 'draw') base.draws += 1;
        rivalryMap.set(key, base);
      });
    return [...rivalryMap.values()]
      .sort(
        (a, b) =>
          b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws) ||
          b.latestSession.updated_at.localeCompare(a.latestSession.updated_at),
      )
      .slice(0, 4);
  }, [currentUserId, sessions]);

  const handleDailyChallengeLaunch = useCallback(
    async (definition: GameDefinition, activeSession: GameSession | null) => {
      if (activeSession) {
        openSession(activeSession);
        return;
      }
      await handleStartSolo(definition);
    },
    [handleStartSolo, openSession],
  );

  const handleRematch = useCallback(
    async (opponentId: string, gameType: string) => {
      const definition = definitions.find(
        (item) => item.game_type === gameType && item.is_multiplayer_capable,
      );
      if (!definition) {
        showToast({
          message: 'That game is not available for rematch yet.',
          severity: 'info',
        });
        return;
      }
      await handleStartMultiplayer(definition, opponentId);
    },
    [definitions, handleStartMultiplayer, showToast],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress aria-label="Loading games" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <SportsEsportsIcon /> Games
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setStartOpen(true)}
          aria-label="Start a game"
        >
          Start game
        </Button>
      </Stack>

      <Stack spacing={3}>
        {waitingOnYou.length > 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              background:
                'linear-gradient(135deg, rgba(24,36,52,0.95) 0%, rgba(14,24,38,0.92) 100%)',
              borderColor: 'rgba(91, 192, 190, 0.28)',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography sx={SECTION_TITLE_SX}>Turn inbox</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {waitingOnYou.length === 1
                    ? 'One friend is waiting on you'
                    : `${waitingOnYou.length} games are waiting on you`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Jump back in, make your move, and keep the room alive.
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => openSession(waitingOnYou[0])}
              >
                Resume next turn
              </Button>
            </Stack>
            <Stack spacing={1.25}>
              {waitingOnYou.slice(0, 3).map((session) => (
                <Paper
                  key={session.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        {getGameName(session)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getSessionSecondary(session, 'waiting_you')}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={() => openSession(session)}
                    >
                      Take turn
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        {dailyChallengeCards.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={SECTION_TITLE_SX}>Daily challenges</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Fresh reasons to check in every day, whether you have five minutes
              or fifty.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              {dailyChallengeCards.map(
                ({ definition, completedToday, activeSession }) => (
                  <Paper
                    key={definition.id}
                    variant="outlined"
                    sx={{ p: 1.5, flex: 1, minWidth: 0, borderRadius: 2 }}
                  >
                    <Typography sx={{ fontWeight: 600 }}>
                      {definition.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minHeight: 40, mt: 0.5 }}
                    >
                      {activeSession
                        ? 'Your run is in progress and ready to resume.'
                        : completedToday
                          ? 'Cleared today. Come back for another warm-up run.'
                          : 'Ready for today’s first attempt.'}
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ mt: 1.5 }}
                      onClick={() =>
                        void handleDailyChallengeLaunch(
                          definition,
                          activeSession,
                        )
                      }
                    >
                      {activeSession
                        ? 'Resume'
                        : completedToday
                          ? 'Play again'
                          : 'Start challenge'}
                    </Button>
                  </Paper>
                ),
              )}
            </Stack>
          </Paper>
        )}

        {pendingInvitations.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={SECTION_TITLE_SX}>Pending invitations</Typography>
            <List disablePadding>
              {pendingInvitations.map((inv) => (
                <ListItemButton
                  key={inv.id}
                  disabled={actingInvitationId === inv.id}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText
                    primary={getInvitationPrimary(inv)}
                    secondary={getInvitationSecondary(inv)}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => void handleAccept(inv)}
                      disabled={actingInvitationId === inv.id}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void handleDecline(inv)}
                      disabled={actingInvitationId === inv.id}
                    >
                      Decline
                    </Button>
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}

        {waitingOnOthers.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={SECTION_TITLE_SX}>Waiting on others</Typography>
            <List disablePadding>
              {waitingOnOthers.map((s) => (
                <ListItemButton
                  key={s.id}
                  onClick={() => openSession(s)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText
                    primary={getGameName(s)}
                    secondary={getSessionSecondary(s, 'waiting_others')}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}

        {activeSolo.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={SECTION_TITLE_SX}>Active (solo)</Typography>
            <List disablePadding>
              {activeSolo.map((s) => (
                <ListItemButton
                  key={s.id}
                  onClick={() => openSession(s)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText
                    primary={getGameName(s)}
                    secondary={getSessionSecondary(s, 'solo')}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}

        {completed.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={SECTION_TITLE_SX}>Rivalries & rematches</Typography>
            {rivalryCards.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Finish a few head-to-head games and your rivalry board will
                start telling the story.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {rivalryCards.map((rivalry) => (
                  <Paper
                    key={`${rivalry.opponentId}:${rivalry.gameType}`}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 2 }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {getProfileLabel(
                            rivalry.opponentId,
                            profilesById,
                            currentUserId,
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {rivalry.gameName} record {rivalry.wins}-
                          {rivalry.losses}
                          {rivalry.draws > 0 ? `-${rivalry.draws}` : ''} · Last
                          played{' '}
                          {new Date(
                            rivalry.latestSession.updated_at,
                          ).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        onClick={() =>
                          void handleRematch(
                            rivalry.opponentId,
                            rivalry.gameType,
                          )
                        }
                      >
                        Rematch
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        )}

        {completed.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={SECTION_TITLE_SX}>Completed</Typography>
            <List disablePadding>
              {completed.map((s) => (
                <ListItemButton
                  key={s.id}
                  onClick={() => openSession(s)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText
                    primary={getGameName(s)}
                    secondary={getSessionSecondary(s, 'completed')}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}

        {pendingInvitations.length === 0 &&
          waitingOnYou.length === 0 &&
          waitingOnOthers.length === 0 &&
          activeSolo.length === 0 &&
          completed.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No games yet. Start a solo game or invite a connection to play.
              </Typography>
            </Paper>
          )}
      </Stack>

      <Dialog
        open={startOpen}
        onClose={() => {
          setStartOpen(false);
          setSelectedDef(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedDef ? `Start ${selectedDef.name}` : 'Choose a game'}
        </DialogTitle>
        <DialogContent>
          {!selectedDef ? (
            <List>
              {definitions
                .filter((d) => d.status === 'active')
                .map((d) => (
                  <ListItemButton key={d.id} onClick={() => setSelectedDef(d)}>
                    <ListItemText
                      primary={d.name}
                      secondary={d.is_solo_capable ? 'Solo' : ''}
                    />
                  </ListItemButton>
                ))}
            </List>
          ) : (
            <Stack spacing={2}>
              {selectedDef.is_solo_capable && (
                <Button
                  variant="contained"
                  onClick={() => void handleStartSolo(selectedDef)}
                >
                  Start solo
                </Button>
              )}
              {selectedDef.is_multiplayer_capable && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">
                    Invite a connection
                  </Typography>
                  {connections.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      You have no connections yet. Connect with members from the
                      Directory first.
                    </Typography>
                  ) : (
                    <List dense>
                      {connections.map((c) => (
                        <ListItemButton
                          key={c.id}
                          onClick={() =>
                            void handleStartMultiplayer(selectedDef, c.id)
                          }
                        >
                          <ListItemText
                            primary={
                              c.display_name || c.handle || c.id.slice(0, 8)
                            }
                            secondary={c.handle ? `@${c.handle}` : undefined}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {resumeSession && (
        <Dialog
          open={Boolean(resumeSession)}
          onClose={() => {
            setResumeSession(null);
            setSearchParams({});
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Resume: {getGameName(resumeSession)}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Session {resumeSession.id.slice(0, 8)}… · Status:{' '}
              {resumeSession.status}
            </Typography>
            <Typography variant="body2">
              Game-specific play UI will be implemented per game (Phuzzle,
              Hangman, Tic-Tac-Toe). Use this framework to load session state
              and render the game board.
            </Typography>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

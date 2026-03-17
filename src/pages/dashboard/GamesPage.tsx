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
import { useCallback, useEffect, useState } from 'react';
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
  getOrCreateDailyWordSession,
  declineInvitation,
  fetchSessionById,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
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
    definitions,
    pendingInvitations,
    waitingOnYou,
    waitingOnOthers,
    activeSolo,
    completed,
    connections,
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

  const getGameName = (session: GameSession) =>
    (session.game_definition as { name?: string } | undefined)?.name ?? 'Game';

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
      if (getGameType(s) === 'daily_word') {
        navigate(`/dashboard/games/daily-word/${s.id}`);
        return;
      }
      setSearchParams({ session: s.id });
    },
    [navigate, setSearchParams],
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
                    primary={`Game invite (session ${inv.session_id.slice(0, 8)}…)`}
                    secondary={`Invitation ID: ${inv.id.slice(0, 8)}…`}
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

        {waitingOnYou.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={SECTION_TITLE_SX}>Waiting on you</Typography>
            <List disablePadding>
              {waitingOnYou.map((s) => (
                <ListItemButton
                  key={s.id}
                  onClick={() => openSession(s)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText
                    primary={getGameName(s)}
                    secondary={`Updated ${new Date(s.updated_at).toLocaleDateString()}`}
                  />
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
                    secondary={`Status: ${s.status} · ${new Date(s.updated_at).toLocaleDateString()}`}
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
                    secondary={`Started ${new Date(s.created_at).toLocaleDateString()}`}
                  />
                </ListItemButton>
              ))}
            </List>
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
                    secondary={`Result: ${s.result ?? '—'} · ${new Date(s.updated_at).toLocaleDateString()}`}
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

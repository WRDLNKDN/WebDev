/**
 * WRDLNKDN games shell: embeds the external Phuzzle app in an iframe for play.
 * Session completion is recorded here via **Mark as complete** (Supabase), not via embed APIs.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  completeSession,
  createSoloSession,
  fetchGameDefinitionByType,
  fetchSessionForGameType,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';

const PHUZZLE_APP_URL = 'https://phuzzle.vercel.app/';

export const PhuzzlePlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'phuzzle');
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    setSession(s);
    setNotFound(false);
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

  const handleMarkComplete = useCallback(async () => {
    if (!session?.id) return;
    setMarkingComplete(true);
    try {
      await completeSession(session.id, 'solved', {
        completed_at: new Date().toISOString(),
      });
      setSession((prev) =>
        prev ? { ...prev, status: 'completed', result: 'solved' } : null,
      );
      showToast({
        message: 'Puzzle marked complete. Nice work!',
        severity: 'success',
      });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setMarkingComplete(false);
    }
  }, [session?.id, showToast]);

  const handleStartNew = useCallback(async () => {
    setStartingNew(true);
    try {
      const def = await fetchGameDefinitionByType('phuzzle');
      if (!def) throw new Error('Phuzzle not available');
      const newSession = await createSoloSession(def.id, {
        started_at: new Date().toISOString(),
      });
      navigate(`/dashboard/games/phuzzle/${newSession.id}`, { replace: true });
      setSession(newSession);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStartingNew(false);
    }
  }, [navigate, showToast]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 320,
        }}
      >
        <CircularProgress aria-label="Loading puzzle session" />
      </Box>
    );
  }

  if (notFound || !session) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Session not found or not a Phuzzle session.
        </Typography>
        <Button
          component={RouterLink}
          to="/dashboard/games"
          variant="contained"
        >
          Back to Games
        </Button>
      </Box>
    );
  }

  const isCompleted = session.status === 'completed';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          flexShrink: 0,
          px: 2,
          py: 1.5,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            startIcon={<ArrowBackIcon />}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Games
          </Button>
          <Typography variant="subtitle2" color="text.secondary">
            Phuzzle
            {isCompleted && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  color: 'success.main',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 18 }} /> Solved
              </Box>
            )}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          {!isCompleted && (
            <Button
              variant="contained"
              size="small"
              disabled={markingComplete}
              onClick={() => void handleMarkComplete()}
              sx={{ textTransform: 'none' }}
            >
              {markingComplete ? 'Saving…' : 'Mark as complete'}
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReplayIcon />}
            disabled={startingNew}
            onClick={() => void handleStartNew()}
            sx={{ textTransform: 'none' }}
          >
            {startingNew ? 'Starting…' : 'New puzzle'}
          </Button>
        </Stack>
      </Paper>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 1, sm: 2 },
        }}
      >
        <Box
          component="iframe"
          title="Embedded puzzle"
          src={PHUZZLE_APP_URL}
          sx={{
            flex: 1,
            minHeight: 400,
            width: '100%',
            border: 'none',
            borderRadius: 2,
            bgcolor: 'background.default',
          }}
        />
      </Box>
    </Box>
  );
};

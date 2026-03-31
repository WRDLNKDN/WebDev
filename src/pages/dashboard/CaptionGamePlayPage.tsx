/**
 * Caption Game: prompt image per round; players submit captions, then vote on the best;
 * top captions recorded for the round. Rounds rotate through images.
 */
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  advanceCaptionGameRound,
  fetchSessionForGameType,
  revealCaptionGameRound,
  startCaptionGameVoting,
  submitCaptionGameCaption,
  submitCaptionGameVote,
  type CaptionGameStatePayload,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { useGameSessionRealtime } from '../../hooks/useGameSessionRealtime';
import type { GameSession, GameSessionParticipant } from '../../types/games';

function getState(session: GameSession): CaptionGameStatePayload {
  const raw = session.state_payload as CaptionGameStatePayload | undefined;
  return {
    imageIds: raw?.imageIds ?? [],
    roundIndex: raw?.roundIndex ?? 0,
    currentImageId: raw?.currentImageId ?? null,
    phase: raw?.phase ?? 'submitting',
    captions: raw?.captions ?? [],
    votes: raw?.votes ?? {},
    roundHistory: raw?.roundHistory ?? [],
  };
}

function getParticipants(session: GameSession): GameSessionParticipant[] {
  return (session.participants ?? []).filter(
    (p) => (p as GameSessionParticipant).acceptance_state === 'accepted',
  ) as GameSessionParticipant[];
}

export const CaptionGamePlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentImage, setCurrentImage] = useState<{
    image_url: string;
    alt_text: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acting, setActing] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then((s) => {
      setUserId(s.data.session?.user?.id ?? null);
    });
  }, []);

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionForGameType(id, 'caption_game');
    if (!s) {
      setNotFound(true);
      setSession(null);
      setCurrentImage(null);
      return;
    }
    setSession(s);
    const state = getState(s);
    const imageId =
      state.currentImageId ?? state.imageIds?.[state.roundIndex ?? 0];
    if (imageId) {
      const { data } = await supabase
        .from('caption_game_images')
        .select('image_url, alt_text')
        .eq('id', imageId)
        .maybeSingle();
      setCurrentImage(data ?? null);
    } else {
      setCurrentImage(null);
    }
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setLoading(false);
      setSession(null);
      return;
    }
    setLoading(true);
    void loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);
  const refreshSession = useCallback(() => {
    if (sessionId?.trim()) void loadSession(sessionId.trim());
  }, [sessionId, loadSession]);
  useGameSessionRealtime(sessionId, refreshSession, Boolean(sessionId?.trim()));

  const state = session ? getState(session) : null;
  const participants = useMemo(
    () => (session ? getParticipants(session) : []),
    [session],
  );
  const participantIds = useMemo(
    () => participants.map((p) => p.user_id),
    [participants],
  );
  const phase = state?.phase ?? 'submitting';
  const captions = useMemo(() => state?.captions ?? [], [state]);
  const votes = useMemo(() => state?.votes ?? {}, [state]);
  const myCaption = useMemo(
    () => captions.find((c) => c.playerId === userId),
    [captions, userId],
  );
  const myVote = userId ? votes[userId] : undefined;
  const allSubmitted =
    participantIds.length > 0 && captions.length >= participantIds.length;
  const allVoted =
    phase === 'voting' &&
    participantIds.length > 0 &&
    Object.keys(votes).length >= participantIds.length;
  const completed = session?.status === 'completed';
  const roundHistory = state?.roundHistory ?? [];

  const handleSubmitCaption = useCallback(async () => {
    if (!session?.id || !captionText.trim() || acting) return;
    setActing(true);
    try {
      await submitCaptionGameCaption(session.id, captionText.trim());
      setCaptionText('');
      await loadSession(session.id);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setActing(false);
    }
  }, [session, captionText, acting, loadSession, showToast]);

  const handleStartVoting = useCallback(async () => {
    if (!session?.id || acting) return;
    setActing(true);
    try {
      await startCaptionGameVoting(session.id);
      await loadSession(session.id);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setActing(false);
    }
  }, [session, acting, loadSession, showToast]);

  const handleVote = useCallback(
    async (index: number) => {
      if (!session?.id || acting) return;
      setActing(true);
      try {
        await submitCaptionGameVote(session.id, index);
        await loadSession(session.id);
      } catch (e) {
        showToast({ message: toMessage(e), severity: 'error' });
      } finally {
        setActing(false);
      }
    },
    [session, acting, loadSession, showToast],
  );

  const handleReveal = useCallback(async () => {
    if (!session?.id || acting) return;
    setActing(true);
    try {
      await revealCaptionGameRound(session.id);
      await loadSession(session.id);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setActing(false);
    }
  }, [session, acting, loadSession, showToast]);

  const handleAdvance = useCallback(async () => {
    if (!session?.id || acting) return;
    setActing(true);
    try {
      await advanceCaptionGameRound(session.id);
      await loadSession(session.id);
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setActing(false);
    }
  }, [session, acting, loadSession, showToast]);

  const voteCounts = useMemo(() => {
    const c: Record<number, number> = {};
    captions.forEach((_, i) => {
      c[i] = Object.values(votes).filter((v) => v === i).length;
    });
    return c;
  }, [captions, votes]);

  const topIndices = useMemo(
    () =>
      Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([i]) => Number(i)),
    [voteCounts],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress aria-label="Loading game" />
      </Box>
    );
  }

  if (notFound || (!sessionId?.trim() && !session)) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Button
            component={RouterLink}
            to="/dashboard/games"
            startIcon={<ArrowBackIcon />}
          >
            Games
          </Button>
        </Stack>
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {notFound
              ? 'Session not found or not a Caption Game.'
              : 'Start this game by inviting connections from the Games page.'}
          </Typography>
          <Button component={RouterLink} to="/dashboard/games">
            Back to Games
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!session || !state) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Button
          component={RouterLink}
          to="/dashboard/games"
          startIcon={<ArrowBackIcon />}
        >
          Games
        </Button>
        <Typography variant="body2" color="text.secondary">
          Round {(state.roundIndex ?? 0) + 1} of {state.imageIds?.length ?? 0}
        </Typography>
      </Stack>

      {completed ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Game complete
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            All rounds finished. Thanks for playing!
          </Typography>
          {roundHistory.length > 0 && (
            <Stack spacing={1}>
              {roundHistory.map((r, i) => (
                <Typography key={i} variant="body2">
                  Round {r.roundIndex + 1}: top captions recorded
                </Typography>
              ))}
            </Stack>
          )}
          <Button component={RouterLink} to="/dashboard/games" sx={{ mt: 2 }}>
            Back to Games
          </Button>
        </Paper>
      ) : (
        <>
          {currentImage && (
            <Paper variant="outlined" sx={{ p: 1, mb: 2, overflow: 'hidden' }}>
              <Box
                component="img"
                src={currentImage.image_url}
                alt={currentImage.alt_text ?? 'Caption prompt'}
                sx={{
                  width: '100%',
                  maxHeight: 280,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </Paper>
          )}

          {phase === 'submitting' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Write a caption
              </Typography>
              {myCaption ? (
                <Typography color="text.secondary">
                  You submitted: &ldquo;{myCaption.text}&rdquo;
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Your caption"
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="Enter a caption (1–500 characters)"
                    inputProps={{ maxLength: 500 }}
                  />
                  <Button
                    variant="contained"
                    disabled={acting || !captionText.trim()}
                    onClick={() => void handleSubmitCaption()}
                  >
                    {acting ? 'Submitting…' : 'Submit caption'}
                  </Button>
                </Stack>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {captions.length} of {participantIds.length} submitted.
                {allSubmitted && (
                  <Button
                    size="small"
                    sx={{ ml: 1 }}
                    onClick={() => void handleStartVoting()}
                    disabled={acting}
                  >
                    Start voting
                  </Button>
                )}
              </Typography>
            </Paper>
          )}

          {phase === 'voting' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Vote for the best caption
              </Typography>
              <Stack spacing={1}>
                {captions.map((c, i) => (
                  <Button
                    key={i}
                    variant={myVote === i ? 'contained' : 'outlined'}
                    fullWidth
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    onClick={() => myVote === undefined && void handleVote(i)}
                    disabled={myVote !== undefined || acting}
                  >
                    {c.text}
                  </Button>
                ))}
              </Stack>
              {myVote !== undefined && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  You voted.{' '}
                  {allVoted && (
                    <Button
                      size="small"
                      onClick={() => void handleReveal()}
                      disabled={acting}
                    >
                      Reveal results
                    </Button>
                  )}
                </Typography>
              )}
            </Paper>
          )}

          {phase === 'revealed' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Top captions this round
              </Typography>
              <Stack spacing={1}>
                {topIndices.map(
                  (idx, rank) =>
                    captions[idx] && (
                      <Typography key={idx} variant="body1">
                        {rank + 1}. &ldquo;{captions[idx].text}&rdquo;
                        {voteCounts[idx] != null && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            {' '}
                            ({voteCounts[idx]} votes)
                          </Typography>
                        )}
                      </Typography>
                    ),
                )}
              </Stack>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => void handleAdvance()}
                disabled={acting}
              >
                {acting ? 'Next…' : 'Next round'}
              </Button>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

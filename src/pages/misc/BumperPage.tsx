/**
 * Full-screen bumper (no nav/footer). Video: public/assets/video/concept-bumper.mp4
 *
 * IF URL has ?from=join → treat as post-Join flow: show bumper; try sound; if user turns sound on,
 * don't auto-redirect so audio isn't cut off — show "Continue to Feed" instead. Else redirect after delay.
 * ELSE → just show bumper (e.g. for recording at /bumper).
 */

import { Helmet } from 'react-helmet-async';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Bumper } from '../../components/bumper/Bumper';
import { setBumperShown } from '../../lib/utils/bumperSession';
import { useJoin } from '../../context/useJoin';

/** How long to show the bumper after Join before redirect when sound stays off (ms). */
const POST_JOIN_BUMPER_MS = 6000;

export const BumperPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromJoin = searchParams.get('from') === 'join';
  const next = searchParams.get('next') ?? '/feed';
  const { resetSignup } = useJoin();
  const [soundOn, setSoundOn] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  const goNext = useCallback(() => {
    setBumperShown();
    navigate(next, { replace: true });
  }, [navigate, next]);

  // IF from=join: reset join state immediately (avoids flicker back to Welcome on Profile submit)
  useEffect(() => {
    if (!fromJoin) return;
    resetSignup();
  }, [fromJoin, resetSignup]);

  // IF from=join and sound off: auto-redirect after delay. When sound on, show Continue instead of cutting off.
  useEffect(() => {
    if (!fromJoin) return;
    if (soundOn) {
      setShowContinue(true);
      return;
    }
    const timer = window.setTimeout(() => {
      goNext();
    }, POST_JOIN_BUMPER_MS);
    return () => window.clearTimeout(timer);
  }, [fromJoin, soundOn, goNext]);

  // When from=join and we haven't redirected, show Continue button after a short delay so they can tap "Sound on" first
  useEffect(() => {
    if (!fromJoin) return;
    const t = window.setTimeout(() => setShowContinue(true), 2000);
    return () => window.clearTimeout(t);
  }, [fromJoin]);

  return (
    <>
      <Helmet>
        <title>WRDLNKDN Bumper | Business, but Weirder.</title>
      </Helmet>
      <Bumper autoPlay postJoinMode={fromJoin} onSoundChange={setSoundOn} />
      {fromJoin && showContinue && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={goNext}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <Typography component="span" variant="button">
              Continue to Feed
            </Typography>
          </Button>
        </Box>
      )}
    </>
  );
};

export default BumperPage;

/**
 * Full-screen bumper for recording or embedding.
 * No nav/footer — use /bumper for a clean capture.
 * Voiceover + video: public/assets/video/concept-bumper.mp4
 *
 * When reached after Join (?from=join&next=/feed): show bumper once per session,
 * then redirect to next (default /feed).
 */

import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bumper } from '../components/bumper/Bumper';
import { setBumperShown } from '../lib/bumperSession';

/** How long to show the bumper after Join before redirect (ms). */
const POST_JOIN_BUMPER_MS = 6000;

export const BumperPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromJoin = searchParams.get('from') === 'join';
  const next = searchParams.get('next') ?? '/feed';

  useEffect(() => {
    if (!fromJoin) return;
    const timer = window.setTimeout(() => {
      setBumperShown();
      navigate(next, { replace: true });
    }, POST_JOIN_BUMPER_MS);
    return () => window.clearTimeout(timer);
  }, [fromJoin, next, navigate]);

  return (
    <>
      <Helmet>
        <title>WRDLNKDN Bumper | Business, but Weirder.</title>
      </Helmet>
      <Bumper autoPlay />
    </>
  );
};

export default BumperPage;

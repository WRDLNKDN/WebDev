/**
 * Full-screen bumper (no nav/footer). Video: public/assets/video/concept-bumper.mp4
 *
 * IF URL has ?from=join → treat as post-Join flow: show bumper for POST_JOIN_BUMPER_MS,
 * set sessionStorage so we don't show again this session, then redirect to ?next= (default /feed).
 * ELSE → just show bumper (e.g. for recording at /bumper).
 */

import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bumper } from '../../components/bumper/Bumper';
import { setBumperShown } from '../../lib/utils/bumperSession';

/** How long to show the bumper after Join before redirect (ms). */
const POST_JOIN_BUMPER_MS = 6000;

export const BumperPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromJoin = searchParams.get('from') === 'join';
  const next = searchParams.get('next') ?? '/feed';

  // IF from=join: after delay, mark bumper shown and redirect. ELSE: no redirect.
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

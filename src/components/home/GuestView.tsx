import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics/trackEvent';

interface GuestViewProps {
  /** @deprecated OAuth removed; kept for backward compat, ignored */
  busy?: boolean;
  /** @deprecated OAuth removed; kept for backward compat, ignored */
  onAuth?: (provider: 'google' | 'azure') => Promise<void>;
  /** When true, only render buttons (for hero backdrop layout). */
  buttonsOnly?: boolean;
  /** When true, use high-contrast opaque styles for CTAs (hero). */
  highContrast?: boolean;
}

/**
 * Hero guest block: Join our Community (→ /join) + Explore Feed.
 * OAuth is done in the Join wizard, not on Home.
 */
export const GuestView = ({
  buttonsOnly = false,
  highContrast = true,
}: GuestViewProps) => {
  const navigate = useNavigate();
  const [joinLoading, setJoinLoading] = useState(false);
  const goToJoin = useCallback(async () => {
    setJoinLoading(true);
    try {
      await import('../../pages/auth/Join');
    } catch {
      // Continue to Join even if preload fails.
    } finally {
      navigate('/join');
    }
  }, [navigate]);

  const primaryClass = highContrast
    ? 'home-landing__button'
    : 'home-landing__button home-landing__button--muted';
  const secondaryClass =
    'home-landing__link-button home-landing__link-button--secondary';

  if (buttonsOnly) {
    return (
      <div className="home-landing__cta-stack">
        <Link
          to="/signin"
          className={secondaryClass}
          aria-label="Already a member? Sign In"
          onClick={() =>
            trackEvent('hero_sign_in_cta_click', { source: 'hero' })
          }
        >
          Already a member? Sign In
        </Link>
        <Link
          to="/join"
          className={primaryClass}
          role="button"
          aria-disabled={joinLoading}
          onClick={(event) => {
            event.preventDefault();
            if (!joinLoading) {
              void goToJoin();
            }
          }}
        >
          {joinLoading ? 'Opening Join…' : 'Join Us'}
        </Link>
      </div>
    );
  }

  return (
    <div className="home-landing__cta-stack">
      <div>
        <h1 className="home-landing__section-title">Business, but weirder.</h1>
        <p className="home-landing__card-body">
          A professional networking space where you do not have to pretend.
        </p>
        <p className="home-landing__card-body">
          For people who build, create, and think differently.
        </p>
      </div>
      <Link
        to="/join"
        className={primaryClass}
        role="button"
        aria-disabled={joinLoading}
        onClick={(event) => {
          event.preventDefault();
          if (!joinLoading) {
            void goToJoin();
          }
        }}
      >
        {joinLoading ? 'Opening Join…' : 'Join our Community'}
      </Link>
      <Link to="/feed" className={secondaryClass}>
        Explore Feed
      </Link>
    </div>
  );
};

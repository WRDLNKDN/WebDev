import { useCallback, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics/trackEvent';

interface GuestViewProps {
  /** @deprecated OAuth removed; kept for backward compat, ignored */
  busy?: boolean;
  /** @deprecated OAuth removed; kept for backward compat, ignored */
  onAuth?: (provider: 'google' | 'azure') => Promise<void>;
  /** When true, only render buttons (for hero backdrop layout). */
  buttonsOnly?: boolean;
  /** When true, hero CTAs stay visible but are non-interactive (session restore in flight). */
  actionsDisabled?: boolean;
  /** When true, use high-contrast opaque styles for CTAs (hero). */
  highContrast?: boolean;
}

type GoToJoinFn = () => Promise<void>;

const GuestViewHeroCtaStack = ({
  actionsDisabled,
  joinLoading,
  goToJoin,
}: {
  actionsDisabled: boolean;
  joinLoading: boolean;
  goToJoin: GoToJoinFn;
}) => {
  const stackClass = [
    'home-landing__cta-stack',
    'home-landing__cta-stack--hero',
    actionsDisabled ? 'home-landing__cta-stack--hero-pending' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const onJoinClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!joinLoading && !actionsDisabled) {
      void goToJoin();
    }
  };

  const onSignInClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (actionsDisabled) {
      e.preventDefault();
      return;
    }
    trackEvent('hero_sign_in_cta_click', { source: 'hero' });
  };

  return (
    <div
      className={stackClass}
      aria-busy={actionsDisabled ? true : undefined}
      aria-label={actionsDisabled ? 'Checking session' : undefined}
    >
      <Link
        to="/join"
        className="home-landing__button home-landing__button--hero-primary"
        role="button"
        aria-disabled={joinLoading || actionsDisabled}
        tabIndex={actionsDisabled ? -1 : undefined}
        onClick={onJoinClick}
      >
        {joinLoading ? 'Opening Join…' : 'Join Us'}
      </Link>
      <Link
        to="/signin"
        className="home-landing__link-button home-landing__link-button--hero-secondary"
        aria-label="Already a member? Sign In"
        aria-disabled={actionsDisabled ? true : undefined}
        tabIndex={actionsDisabled ? -1 : undefined}
        onClick={onSignInClick}
      >
        Already a member? Sign In
      </Link>
    </div>
  );
};

const GuestViewDefaultStack = ({
  primaryClass,
  secondaryClass,
  joinLoading,
  goToJoin,
}: {
  primaryClass: string;
  secondaryClass: string;
  joinLoading: boolean;
  goToJoin: GoToJoinFn;
}) => {
  const onJoinClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!joinLoading) {
      void goToJoin();
    }
  };

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
        onClick={onJoinClick}
      >
        {joinLoading ? 'Opening Join…' : 'Join our Community'}
      </Link>
      <Link to="/feed" className={secondaryClass}>
        Explore Feed
      </Link>
    </div>
  );
};

/**
 * Hero guest block: Join our Community (→ /join) + Explore Feed.
 * OAuth is done in the Join wizard, not on Home.
 */
export const GuestView = ({
  buttonsOnly = false,
  actionsDisabled = false,
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

  if (buttonsOnly) {
    return (
      <GuestViewHeroCtaStack
        actionsDisabled={actionsDisabled}
        joinLoading={joinLoading}
        goToJoin={goToJoin}
      />
    );
  }

  const primaryClass = highContrast
    ? 'home-landing__button'
    : 'home-landing__button home-landing__button--muted';
  const secondaryClass =
    'home-landing__link-button home-landing__link-button--secondary';

  return (
    <GuestViewDefaultStack
      primaryClass={primaryClass}
      secondaryClass={secondaryClass}
      joinLoading={joinLoading}
      goToJoin={goToJoin}
    />
  );
};

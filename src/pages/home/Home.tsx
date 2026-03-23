import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { GuestView } from '../../components/home/GuestView';
import { HowItWorks } from '../../components/home/HowItWorks';
import { SocialProof } from '../../components/home/SocialProof';
import { WhatMakesDifferent } from '../../components/home/WhatMakesDifferent';
import '../../components/home/homeLanding.css';
import {
  useMarketingHomeMode,
  useProductionComingSoonMode,
} from '../../context/FeatureFlagsContext';
import { getSessionWithTimeout } from '../../lib/auth/getSessionWithTimeout';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import { toMessage } from '../../lib/utils/errors';
import {
  resetHomeHeroPhase,
  setHomeHeroPhase,
} from '../../lib/utils/homeHeroPhaseStore';
import type { HomeHeroUiMode } from '../../lib/utils/homeHeroUiMode';
import {
  HOME_HERO_FOOTER_DELAY_AFTER_UNMOUNT_MS,
  HOME_HERO_VIDEO_FADE_MS,
} from '../../lib/utils/homeHeroRevealTiming';

const getSupabase = async () => {
  const mod = await import('../../lib/auth/supabaseClient');
  return mod.supabase;
};

const getStoredSessionTokens = async (): Promise<{
  access_token: string;
  refresh_token: string;
} | null> => {
  try {
    const mod = await import('../../lib/auth/supabaseClient');
    const raw = window.localStorage.getItem(mod.AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
      currentSession?: {
        access_token?: string;
        refresh_token?: string;
      };
    } | null;
    const direct =
      parsed?.access_token && parsed?.refresh_token
        ? parsed
        : parsed?.currentSession;
    if (!direct?.access_token || !direct.refresh_token) return null;
    return {
      access_token: direct.access_token,
      refresh_token: direct.refresh_token,
    };
  } catch {
    return null;
  }
};

/**
 * Home: public brand landing at /. MVP = intro video, Join Us CTA, persistent header.
 * No authenticated data rendered. No OAuth on /; auth entry is /join only.
 * If user is already authenticated and onboarded, redirect to /dashboard.
 * **`coming_soon` on UAT or PROD:** Full **black** viewport during video (matte +
 * hero backdrop); headline and CTAs stay visible for the whole video (no delayed
 * fade-in). On end/skip, the video fades out, the shell crossfades to the Layout
 * grid, and the hero **compresses in the same window** so sections below (e.g.
 * What Makes This Different) move up without a tall dead zone. **UAT:** Join +
 * Sign-in (GuestView). **PROD:** Same headline/tagline + purple **COMING SOON!!**
 * (no auth CTAs).
 */
export const Home = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const authStartedRef = useRef(false);
  const marketingHome = useMarketingHomeMode();
  const productionComingSoon = useProductionComingSoonMode();

  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ id: string } | null>(null);
  /** When session exists and onboarded, redirect to /dashboard (no auth data on Home). */
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const [videoFailed, setVideoFailed] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showFooter, setShowFooter] = useState(false);

  /**
   * Video opacity / playback handoff only (`playing` → `dimmed`). For layout and CSS,
   * use `heroMode` (`HomeHeroUiMode`): `video` = full intro, `compact` = post-intro
   * when `hasIntroFinished` (dimmed, ended, reduced motion, or error).
   */
  const [heroPhase, setHeroPhase] = useState<'playing' | 'dimmed'>(() =>
    prefersReducedMotion ? 'dimmed' : 'playing',
  );

  /** After video (or skip / error): crossfade shell + unmount video; copy stays visible throughout. */
  const finishHomeHeroTransition = useCallback(() => {
    if (!prefersReducedMotion) {
      setHeroPhase('dimmed');
      window.setTimeout(() => {
        setVideoEnded(true);
        window.setTimeout(
          () => setShowFooter(true),
          HOME_HERO_FOOTER_DELAY_AFTER_UNMOUNT_MS,
        );
      }, HOME_HERO_VIDEO_FADE_MS);
    } else {
      setHeroPhase('dimmed');
      setVideoEnded(true);
      window.setTimeout(
        () => setShowFooter(true),
        HOME_HERO_FOOTER_DELAY_AFTER_UNMOUNT_MS,
      );
    }
  }, [prefersReducedMotion]);

  const ensureVideoPlayback = useCallback(() => {
    const el = videoRef.current;
    /* Wait for <video> mount; onLoadedData will call again — do not reveal early (matte + no poster flash). */
    if (!el) {
      return;
    }
    if (prefersReducedMotion || videoFailed) {
      finishHomeHeroTransition();
      return;
    }
    try {
      const playAttempt = el.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        void playAttempt.catch(() => {
          setVideoFailed(true);
          finishHomeHeroTransition();
        });
      }
    } catch {
      setVideoFailed(true);
      finishHomeHeroTransition();
    }
  }, [prefersReducedMotion, finishHomeHeroTransition, videoFailed]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadAuthState = async () => {
      try {
        const supabase = await getSupabase();
        const { data: initialData, error: sessionError } =
          await getSessionWithTimeout();
        let data = initialData;
        if (!mounted) return;

        if (sessionError) {
          console.warn('Session check warning:', sessionError.message);
        }

        if (!data.session) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (!mounted) return;
          if (refreshed.session) {
            data = refreshed;
          }
        }

        if (!data.session) {
          const storedTokens = await getStoredSessionTokens();
          if (!mounted) return;
          if (storedTokens) {
            const { data: restored } =
              await supabase.auth.setSession(storedTokens);
            if (!mounted) return;
            if (restored.session) {
              data = restored;
            }
          }
        }

        const user = data.session?.user;
        setSession(user ? { id: user.id } : null);
        if (!user) {
          setOnboarded(null);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, join_reason, participation_style')
          .eq('id', user.id)
          .maybeSingle();
        if (!mounted) return;
        setOnboarded(profile ? isProfileOnboarded(profile) : false);
      } catch (err) {
        if (mounted) {
          setError(toMessage(err));
          setOnboarded(null);
        }
      }
    };

    const startAuth = () => {
      if (authStartedRef.current) return;
      authStartedRef.current = true;
      // Defer auth check until after initial paint to avoid blocking LCP
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          void loadAuthState();
        });
      } else {
        setTimeout(() => {
          void loadAuthState();
        }, 0);
      }
      void (async () => {
        const supabase = await getSupabase();
        if (!mounted) return;
        const { data: sub } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (!mounted) return;
            setSession(newSession?.user ? { id: newSession.user.id } : null);
            if (!newSession?.user) {
              setOnboarded(null);
              return;
            }
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, join_reason, participation_style')
              .eq('id', newSession.user.id)
              .maybeSingle();
            if (!mounted) return;
            setOnboarded(profile ? isProfileOnboarded(profile) : false);
          },
        );
        unsubscribe = () => sub.subscription.unsubscribe();
      })();
    };

    const triggerAuthBootstrap = () => {
      startAuth();
      window.removeEventListener('pointerdown', triggerAuthBootstrap);
      window.removeEventListener('pointermove', triggerAuthBootstrap);
      window.removeEventListener('keydown', triggerAuthBootstrap);
      window.removeEventListener('focus', triggerAuthBootstrap);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerAuthBootstrap();
      }
    };

    triggerAuthBootstrap();

    window.addEventListener('pointerdown', triggerAuthBootstrap, {
      passive: true,
    });
    window.addEventListener('pointermove', triggerAuthBootstrap, {
      passive: true,
      once: true,
    });
    window.addEventListener('keydown', triggerAuthBootstrap);
    window.addEventListener('focus', triggerAuthBootstrap);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener('pointerdown', triggerAuthBootstrap);
      window.removeEventListener('pointermove', triggerAuthBootstrap);
      window.removeEventListener('keydown', triggerAuthBootstrap);
      window.removeEventListener('focus', triggerAuthBootstrap);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe?.();
    };
  }, []);

  // When session exists but onboarded is still null (e.g. auth state changed), resolve onboarding.
  useEffect(() => {
    if (!session?.id || onboarded !== null) return;
    let mounted = true;
    void (async () => {
      const supabase = await getSupabase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, join_reason, participation_style')
        .eq('id', session.id)
        .maybeSingle();
      if (!mounted) return;
      setOnboarded(profile ? isProfileOnboarded(profile) : false);
    })();
    return () => {
      mounted = false;
    };
  }, [session?.id, onboarded]);

  // Scroll tracking removed - no scrolling on home page

  const handleVideoEnded = () => {
    finishHomeHeroTransition();
  };

  /** Tap video/backdrop to skip to centered copy + brand background. */
  const handleHeroSkip = useCallback(() => {
    if (prefersReducedMotion || videoFailed || heroPhase === 'dimmed') return;
    videoRef.current?.pause();
    finishHomeHeroTransition();
  }, [prefersReducedMotion, videoFailed, heroPhase, finishHomeHeroTransition]);

  // 1.5x playback improves pacing; respect prefers-reduced-motion
  const setPlaybackRate = useCallback(() => {
    const el = videoRef.current;
    if (el && !prefersReducedMotion) {
      el.playbackRate = 1.5;
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    ensureVideoPlayback();
  }, [ensureVideoPlayback]);

  useEffect(() => {
    const hasIntroFinished =
      heroPhase === 'dimmed' ||
      videoEnded ||
      prefersReducedMotion ||
      videoFailed;
    setHomeHeroPhase(hasIntroFinished ? 'reveal' : 'video');
  }, [heroPhase, videoEnded, prefersReducedMotion, videoFailed]);

  useEffect(() => {
    return () => {
      resetHomeHeroPhase();
    };
  }, []);

  // Control footer visibility via data attribute (homeLanding.css hides footer until this is set).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showFooter) {
      document.documentElement.setAttribute('data-footer-visible', 'true');
    } else {
      document.documentElement.removeAttribute('data-footer-visible');
    }
  }, [showFooter]);

  // Onboarded Members → dashboard unless production “gates closed” (marketing-only prod).
  if (session && onboarded === true && !productionComingSoon) {
    return <Navigate to="/dashboard" replace />;
  }

  /** Local dev: classic guest hero video. UAT/PROD + flag: same marketing hero pipeline. */
  const showLocalGuestVideo =
    !marketingHome && !prefersReducedMotion && !videoFailed;
  const showMarketingHeroVideo =
    marketingHome && !prefersReducedMotion && !videoFailed;
  const showMarketingHeroPoster =
    marketingHome && (prefersReducedMotion || videoFailed);

  const renderHeroMotionVideo =
    (showMarketingHeroVideo || showLocalGuestVideo) && !videoEnded;

  const hasIntroFinished =
    heroPhase === 'dimmed' || videoEnded || prefersReducedMotion || videoFailed;

  const heroMode: HomeHeroUiMode = hasIntroFinished ? 'compact' : 'video';

  return (
    <main
      className={[
        'home-landing',
        marketingHome &&
        heroPhase === 'playing' &&
        !prefersReducedMotion &&
        !videoFailed
          ? 'home-landing--coming-soon'
          : '',
        marketingHome && !videoEnded && !prefersReducedMotion && !videoFailed
          ? 'home-landing--marketing-video-phase'
          : '',
        /* Compact: stop flex-growing main so below-the-fold sections move up (desktop + mobile) */
        heroMode === 'compact' ? 'home-landing--hero-compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-home-hero-mode={heroMode}
      data-testid="signed-out-landing"
    >
      <section
        className={[
          'home-landing__hero',
          /* Drop tall coming-soon min-height as soon as handoff starts so compact transition runs cleanly */
          marketingHome &&
          !videoEnded &&
          !prefersReducedMotion &&
          !videoFailed &&
          heroMode === 'video'
            ? 'home-landing__hero--coming-soon'
            : '',
          /* Post-intro: tight height, transparent backdrop, grid shows through */
          heroMode === 'compact' ? 'home-landing__hero--compact' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className="home-landing__hero-backdrop"
          onPointerDown={handleHeroSkip}
          aria-hidden="true"
        >
          {showMarketingHeroPoster ? (
            <img
              className="home-landing__video home-landing__video--focus-feet"
              src="/assets/video/hero-bg-poster.jpg"
              alt=""
              aria-hidden="true"
            />
          ) : null}
          {renderHeroMotionVideo ? (
            <video
              ref={videoRef}
              className={[
                'home-landing__video',
                'home-landing__video--focus-feet',
                heroPhase === 'dimmed' ? 'home-landing__video--dimmed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              autoPlay
              muted
              loop={false}
              playsInline
              preload="auto"
              onLoadedMetadata={setPlaybackRate}
              onCanPlay={setPlaybackRate}
              onLoadedData={ensureVideoPlayback}
              onEnded={handleVideoEnded}
              onError={(e) => {
                console.error('Video error:', e);
                setVideoFailed(true);
                finishHomeHeroTransition();
              }}
              aria-hidden="true"
            >
              <source
                media="(max-width: 767px)"
                src="/assets/video/hero-bg-mobile.mp4"
                type="video/mp4"
              />
              <source
                src="/assets/video/hero-bg-desktop.mp4"
                type="video/mp4"
              />
            </video>
          ) : null}

          <div
            className={`home-landing__video-overlay${heroPhase === 'dimmed' ? ' home-landing__video-overlay--dimmed' : ''}`}
          />
        </div>

        {!productionComingSoon ? (
          <div
            className="home-landing__content home-landing__content--visible"
            data-testid="app-main"
            aria-hidden={false}
          >
            <div className="home-landing__hero-grid">
              <div className="home-landing__headline">
                {error ? (
                  <div className="home-landing__error" role="alert">
                    {error}
                  </div>
                ) : null}
                <h1 className="home-landing__title">WRDLNKDN</h1>
                <div className="home-landing__copy">
                  <p className="home-landing__pronunciation">
                    (Weird Link-uh-din)
                  </p>
                  <p className="home-landing__tagline">
                    Business, but weirder.
                  </p>
                  <p className="home-landing__subcopy">
                    A networking space for people who think differently
                  </p>
                </div>
              </div>
              <div className="home-landing__cta">
                <GuestView buttonsOnly />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="home-landing__content home-landing__content--coming-soon home-landing__content--visible"
            data-testid="production-coming-soon-hero-copy"
            aria-hidden={false}
          >
            <div className="home-landing__hero-grid home-landing__hero-grid--coming-soon">
              <div className="home-landing__headline">
                <h1 className="home-landing__title">WRDLNKDN</h1>
                <div className="home-landing__copy">
                  <p className="home-landing__pronunciation">
                    (Weird Link-uh-din)
                  </p>
                  <p className="home-landing__tagline">
                    Business, but weirder.
                  </p>
                  <p className="home-landing__subcopy">
                    A networking space for people who think differently
                  </p>
                </div>
              </div>
              <div className="home-landing__cta">
                <p
                  className="home-landing__coming-soon"
                  aria-label="Coming soon"
                >
                  COMING SOON!!
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
      {!productionComingSoon ? (
        <>
          <WhatMakesDifferent />
          <HowItWorks />
          <SocialProof />
        </>
      ) : null}
    </main>
  );
};

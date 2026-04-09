import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { GuestView } from '../../components/home/GuestView';
import { HowItWorks } from '../../components/home/HowItWorks';
import { WhatMakesDifferent } from '../../components/home/WhatMakesDifferent';
import { WhyWrdlnkdnVideo } from '../../components/home/WhyWrdlnkdnVideo';
import '../../components/home/homeLanding.css';
import {
  useMarketingHomeMode,
  useProductionComingSoonMode,
} from '../../context/FeatureFlagsContext';
import { isBenignSupabaseAuthLockContentionError } from '../../lib/auth/supabaseAuthLockErrors';
import { AUTH_STORAGE_KEY } from '../../lib/auth/supabaseClient';
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

/** Sync read so hero CTAs never flash Join/Sign in while a session is restoring from storage. */
const hasStoredAuthTokensSync = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
      currentSession?: { access_token?: string; refresh_token?: string };
    } | null;
    const direct =
      parsed?.access_token && parsed?.refresh_token
        ? parsed
        : parsed?.currentSession;
    return Boolean(direct?.access_token && direct?.refresh_token);
  } catch {
    return false;
  }
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
 * grid, and the hero **compresses from the bottom** (copy stays high) so sections
 * below (e.g. What Makes This Different) peek into view without a tall dead zone.
 * **UAT:** Join +
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
  /** After first `loadAuthState` run (avoids showing guest CTAs while tokens exist but session not hydrated yet). */
  const [authInitialCheckDone, setAuthInitialCheckDone] = useState(false);

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
      /* No `<video>` in DOM (e.g. poster-only / marketing + PRM) — still run handoff. */
      if (prefersReducedMotion || videoFailed) {
        finishHomeHeroTransition();
      }
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
          if (isBenignSupabaseAuthLockContentionError(err)) {
            console.warn(
              '[Home] Supabase auth lock contention (ignored on public landing):',
              err,
            );
          } else {
            setError(toMessage(err));
          }
          setOnboarded(null);
        }
      } finally {
        if (mounted) {
          setAuthInitialCheckDone(true);
        }
      }
    };

    const startAuth = () => {
      if (authStartedRef.current) return;
      authStartedRef.current = true;
      const runLoadAuth = () => void loadAuthState();
      // Likely signed-in: resolve session on a microtask so hero never flashes guest CTAs.
      // Otherwise defer to idle / timeout to protect LCP for true guests.
      if (typeof window !== 'undefined' && hasStoredAuthTokensSync()) {
        queueMicrotask(runLoadAuth);
      } else if (
        typeof window !== 'undefined' &&
        'requestIdleCallback' in window
      ) {
        requestIdleCallback(runLoadAuth);
      } else {
        setTimeout(runLoadAuth, 0);
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

  // Scope deferred footer CSS to Home only (see homeLanding.css + Layout data-docked-footer).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.homeFooterPending = 'true';
    return () => {
      delete document.documentElement.dataset.homeFooterPending;
      delete document.documentElement.dataset.footerVisible;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showFooter) {
      document.documentElement.dataset.footerVisible = 'true';
    } else {
      delete document.documentElement.dataset.footerVisible;
    }
  }, [showFooter]);

  /**
   * When no `<video>` is mounted, `ensureVideoPlayback` never runs `finishHomeHeroTransition`
   * (videoRef is null). That left `showFooter` false forever, so `data-footer-visible` was
   * never set and homeLanding.css kept the docked footer hidden (UAT / PRM / poster paths).
   */
  useEffect(() => {
    const showLocalGuestVideo =
      !marketingHome && !prefersReducedMotion && !videoFailed;
    const showMarketingHeroVideo =
      marketingHome && !prefersReducedMotion && !videoFailed;
    const renderHeroMotionVideo =
      (showMarketingHeroVideo || showLocalGuestVideo) && !videoEnded;

    const hasIntroFinished =
      heroPhase === 'dimmed' ||
      videoEnded ||
      prefersReducedMotion ||
      videoFailed;

    if (showFooter || !hasIntroFinished || renderHeroMotionVideo) {
      return;
    }

    const tid = globalThis.setTimeout(() => {
      setShowFooter(true);
    }, HOME_HERO_FOOTER_DELAY_AFTER_UNMOUNT_MS);
    return () => globalThis.clearTimeout(tid);
  }, [
    marketingHome,
    prefersReducedMotion,
    videoFailed,
    videoEnded,
    heroPhase,
    showFooter,
  ]);

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

  const storageAuthHint = hasStoredAuthTokensSync();
  const showSignedOutMarketingVideo =
    !session && (!storageAuthHint || authInitialCheckDone);

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
          {showMarketingHeroPoster && heroMode === 'video' ? (
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
              poster="/assets/video/hero-bg-poster.jpg"
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
                const el = e.currentTarget;
                const mediaError = el.error;
                console.error('Video error:', {
                  code: mediaError?.code,
                  message: mediaError?.message,
                  currentSrc: el.currentSrc,
                  networkState: el.networkState,
                });
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
                {session ? (
                  <div className="home-landing__cta-stack">
                    {onboarded === false ? (
                      <Link
                        to="/join"
                        className="home-landing__button"
                        aria-label="Continue setup"
                      >
                        Continue setup
                      </Link>
                    ) : onboarded === true ? (
                      <Link
                        to="/dashboard"
                        className="home-landing__button"
                        aria-label="Open dashboard"
                      >
                        Open dashboard
                      </Link>
                    ) : null}
                  </div>
                ) : storageAuthHint && !authInitialCheckDone ? (
                  <div
                    className="home-landing__cta-stack"
                    aria-busy="true"
                    aria-label="Checking session"
                  />
                ) : (
                  <GuestView buttonsOnly />
                )}
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
      {/* Marketing sections: same on UAT and PROD (coming-soon still hides Join in hero only). */}
      <WhatMakesDifferent />
      {showSignedOutMarketingVideo ? <WhyWrdlnkdnVideo /> : null}
      <HowItWorks />
    </main>
  );
};

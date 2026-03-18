import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Navigate } from 'react-router-dom';

import { GuestView } from '../../components/home/GuestView';
import '../../components/home/homeLanding.css';
import { getSessionWithTimeout } from '../../lib/auth/getSessionWithTimeout';
import { trackEvent } from '../../lib/analytics/trackEvent';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import { toMessage } from '../../lib/utils/errors';

const WhatMakesDifferent = lazy(async () => ({
  default: (await import('../../components/home/WhatMakesDifferent'))
    .WhatMakesDifferent,
}));
const HowItWorks = lazy(async () => ({
  default: (await import('../../components/home/HowItWorks')).HowItWorks,
}));
const SocialProof = lazy(async () => ({
  default: (await import('../../components/home/SocialProof')).SocialProof,
}));

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
 */
export const Home = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrollMilestonesSeenRef = useRef<Set<number>>(new Set());
  const belowFoldTrackedRef = useRef(false);
  const authStartedRef = useRef(false);

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

  const [showContent, setShowContent] = useState(prefersReducedMotion);

  const [heroPhase, setHeroPhase] = useState<'playing' | 'dimmed'>(() =>
    prefersReducedMotion ? 'dimmed' : 'playing',
  );

  const ensureVideoPlayback = useCallback(() => {
    const el = videoRef.current;
    if (!el || prefersReducedMotion) return;
    try {
      const playAttempt = el.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        void playAttempt.catch(() => {
          // Best effort only. If autoplay is blocked, the page still remains usable.
        });
      }
    } catch {
      // Best effort only. If autoplay is blocked, the page still remains usable.
    }
  }, [prefersReducedMotion]);

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
      void loadAuthState();
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const milestones = [25, 50, 75, 100];
    const handleScrollDepth = () => {
      const doc = document.documentElement;
      const maxScrollable = doc.scrollHeight - window.innerHeight;
      if (maxScrollable <= 0) return;
      const depthPercent = Math.min(
        100,
        Math.round((window.scrollY / maxScrollable) * 100),
      );
      if (!belowFoldTrackedRef.current && depthPercent >= 25) {
        belowFoldTrackedRef.current = true;
        trackEvent('home_below_fold_reached', {
          source: 'home',
          depth_percent: depthPercent,
        });
      }
      milestones.forEach((milestone) => {
        if (depthPercent < milestone) return;
        if (scrollMilestonesSeenRef.current.has(milestone)) return;
        scrollMilestonesSeenRef.current.add(milestone);
        trackEvent('home_scroll_depth', {
          source: 'home',
          depth_percent: milestone,
          viewport_height: window.innerHeight,
          document_height: doc.scrollHeight,
        });
      });
    };
    window.addEventListener('scroll', handleScrollDepth, { passive: true });
    window.addEventListener('resize', handleScrollDepth);
    handleScrollDepth();
    return () => {
      window.removeEventListener('scroll', handleScrollDepth);
      window.removeEventListener('resize', handleScrollDepth);
    };
  }, []);

  const handleVideoEnded = () => {
    if (!prefersReducedMotion) setHeroPhase('dimmed');
    setShowContent(true);
  };

  const handleHeroSkip = useCallback(() => {
    if (showContent) return;
    if (!prefersReducedMotion) {
      setHeroPhase('dimmed');
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setShowContent(true);
  }, [prefersReducedMotion, showContent]);

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

  // Authenticated and onboarded: redirect to /dashboard (Home is public only).
  if (session && onboarded === true) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="home-landing" data-testid="signed-out-landing">
      <section className="home-landing__hero" onPointerDown={handleHeroSkip}>
        {!prefersReducedMotion && !videoFailed ? (
          <video
            ref={videoRef}
            className={`home-landing__video${heroPhase === 'dimmed' ? ' home-landing__video--dimmed' : ''}`}
            autoPlay
            muted
            loop={false}
            playsInline
            preload="metadata"
            poster="/assets/video/hero-bg-poster.jpg"
            onLoadedMetadata={setPlaybackRate}
            onCanPlay={setPlaybackRate}
            onLoadedData={ensureVideoPlayback}
            onEnded={handleVideoEnded}
            onError={() => {
              setVideoFailed(true);
              setHeroPhase('dimmed');
              setShowContent(true);
            }}
            aria-hidden="true"
          >
            <source
              media="(max-width: 767px)"
              src="/assets/video/hero-bg-mobile.mp4"
              type="video/mp4"
            />
            <source src="/assets/video/hero-bg-desktop.mp4" type="video/mp4" />
          </video>
        ) : null}

        <div
          className={`home-landing__video-overlay${heroPhase === 'dimmed' ? ' home-landing__video-overlay--dimmed' : ''}`}
        />

        <div
          className={`home-landing__content${showContent ? ' home-landing__content--visible' : ''}`}
          data-testid="app-main"
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
                <p className="home-landing__tagline">Business, but weirder.</p>
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
      </section>
      <Suspense fallback={null}>
        <WhatMakesDifferent />
        <HowItWorks />
        <SocialProof />
      </Suspense>
    </main>
  );
};

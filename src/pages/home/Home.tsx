import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { GuestView } from '../../components/home/GuestView';
import '../../components/home/homeLanding.css';
import { usePublicComingSoonMode } from '../../context/FeatureFlagsContext';
import { getSessionWithTimeout } from '../../lib/auth/getSessionWithTimeout';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import { toMessage } from '../../lib/utils/errors';

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
 * On wrdlnkdn.vercel.app, only video + "Coming soon" is shown (no login widget).
 */
export const Home = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const authStartedRef = useRef(false);
  const comingSoon = usePublicComingSoonMode();

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
  const [showContent, setShowContent] = useState(false);
  const [showFooter, setShowFooter] = useState(false);

  const [heroPhase, setHeroPhase] = useState<'playing' | 'dimmed'>(() =>
    prefersReducedMotion ? 'dimmed' : 'playing',
  );

  /** Coming soon: keep video visible — never dim hero (dim was hiding the whole video on prod). */
  const revealComingSoonContent = useCallback(() => {
    setShowContent(true);
    setTimeout(() => setShowFooter(true), 500);
  }, []);

  // Coming soon: reveal content immediately without waiting for video
  useEffect(() => {
    if (!comingSoon) return;
    revealComingSoonContent();
  }, [comingSoon, revealComingSoonContent]);

  const ensureVideoPlayback = useCallback(() => {
    const el = videoRef.current;
    if (!el) {
      // Wait for <video> to mount — do not "reveal" yet or we dim before first paint (prod bug).
      if (!comingSoon) {
        setShowContent(true);
        setTimeout(() => setShowFooter(true), 500);
      }
      return;
    }
    if (prefersReducedMotion || videoFailed) {
      if (comingSoon) {
        revealComingSoonContent();
      } else {
        setShowContent(true);
        setTimeout(() => setShowFooter(true), 500);
      }
      return;
    }
    // Don't show content yet - wait for video to end or be clicked
    try {
      const playAttempt = el.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        void playAttempt.catch(() => {
          if (comingSoon) {
            setVideoFailed(true);
            revealComingSoonContent();
          } else {
            setShowContent(true);
            setTimeout(() => setShowFooter(true), 500);
          }
        });
      }
      // Video is playing - content will show when video ends or is clicked
    } catch {
      if (comingSoon) {
        setVideoFailed(true);
        revealComingSoonContent();
      } else {
        setShowContent(true);
        setTimeout(() => setShowFooter(true), 500);
      }
    }
  }, [comingSoon, prefersReducedMotion, revealComingSoonContent, videoFailed]);

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
    if (comingSoon) {
      revealComingSoonContent();
      return;
    }
    // Show content when video ends
    setShowContent(true);
    if (!prefersReducedMotion) {
      setHeroPhase('dimmed');
      // After video fades out, collapse the hero area
      setTimeout(() => {
        setVideoEnded(true);
        // Ensure footer is shown when video ends
        setTimeout(() => setShowFooter(true), 800);
      }, 1000); // Wait for fade transition to complete
    } else {
      setVideoEnded(true);
      setTimeout(() => setShowFooter(true), 800);
    }
  };

  /** Tap video/backdrop to end hero motion early and show content immediately. */
  const handleHeroSkip = useCallback(() => {
    if (prefersReducedMotion || videoFailed || heroPhase === 'dimmed') return;
    if (comingSoon) {
      videoRef.current?.pause();
      revealComingSoonContent();
      return;
    }
    // Show content immediately when clicked
    setShowContent(true);
    setHeroPhase('dimmed');
    videoRef.current?.pause();
    // Collapse after fade transition
    setTimeout(() => {
      setVideoEnded(true);
      setTimeout(() => setShowFooter(true), 800);
    }, 1000);
  }, [
    prefersReducedMotion,
    videoFailed,
    heroPhase,
    comingSoon,
    revealComingSoonContent,
  ]);

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

  // Control footer visibility via data attribute (homeLanding.css hides footer until this is set).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showFooter || comingSoon) {
      document.documentElement.setAttribute('data-footer-visible', 'true');
    } else {
      document.documentElement.removeAttribute('data-footer-visible');
    }
  }, [showFooter, comingSoon]);

  // Coming soon footer visibility handled in revealComingSoonContent effect above

  // Disable scrolling on home page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const preventScroll = (e: WheelEvent | TouchEvent) => {
      e.preventDefault();
    };

    // Prevent wheel scrolling
    window.addEventListener('wheel', preventScroll, { passive: false });
    // Prevent touch scrolling
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // Authenticated and onboarded: redirect to dashboard unless public site is in coming soon (stay on marketing home).
  if (session && onboarded === true && !comingSoon) {
    return <Navigate to="/dashboard" replace />;
  }

  const showGuestVideo = !comingSoon && !prefersReducedMotion && !videoFailed;
  const showComingSoonVideo =
    comingSoon && !prefersReducedMotion && !videoFailed;
  const showComingSoonPoster =
    comingSoon && (prefersReducedMotion || videoFailed);

  return (
    <main
      className={['home-landing', comingSoon ? 'home-landing--coming-soon' : '']
        .filter(Boolean)
        .join(' ')}
      data-testid="signed-out-landing"
    >
      <section
        className={[
          'home-landing__hero',
          comingSoon ? 'home-landing__hero--coming-soon' : '',
          videoEnded && !comingSoon ? 'home-landing__hero--collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className="home-landing__hero-backdrop"
          onPointerDown={handleHeroSkip}
          aria-hidden="true"
        >
          {showComingSoonPoster ? (
            <img
              className="home-landing__video home-landing__video--focus-feet"
              src="/assets/video/hero-bg-poster.jpg"
              alt=""
              aria-hidden="true"
            />
          ) : null}
          {showComingSoonVideo || showGuestVideo ? (
            <video
              ref={videoRef}
              className={[
                'home-landing__video',
                'home-landing__video--focus-feet',
                !comingSoon && heroPhase === 'dimmed'
                  ? 'home-landing__video--dimmed'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              autoPlay
              muted
              loop={false}
              playsInline
              preload="auto"
              poster="/assets/video/hero-bg-poster.jpg"
              onLoadedMetadata={setPlaybackRate}
              onCanPlay={setPlaybackRate}
              onLoadedData={ensureVideoPlayback}
              onEnded={handleVideoEnded}
              onError={(e) => {
                console.error('Video error:', e);
                setVideoFailed(true);
                if (comingSoon) {
                  revealComingSoonContent();
                } else {
                  setHeroPhase('dimmed');
                  setVideoEnded(true);
                  setShowContent(true);
                  setTimeout(() => setShowFooter(true), 500);
                }
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
            className={`home-landing__video-overlay${!comingSoon && heroPhase === 'dimmed' ? ' home-landing__video-overlay--dimmed' : ''}`}
          />
        </div>

        {!comingSoon ? (
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
            className="home-landing__content home-landing__content--visible home-landing__content--coming-soon"
            data-testid="coming-soon-hero-copy"
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
                </div>
              </div>
              <div className="home-landing__cta">
                <p className="home-landing__coming-soon">Coming soon</p>
              </div>
            </div>
          </div>
        )}
      </section>
      {/* Sections removed - no scrolling on home page */}
    </main>
  );
};

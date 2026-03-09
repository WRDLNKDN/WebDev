// src/pages/Home.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';

import { HomeSkeleton } from '../../components/home/HomeSkeleton';
import { HowItWorks } from '../../components/home/HowItWorks';
import { SocialProof } from '../../components/home/SocialProof';
import { WhatMakesDifferent } from '../../components/home/WhatMakesDifferent';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';
import { trackEvent } from '../../lib/analytics/trackEvent';
import { supabase } from '../../lib/auth/supabaseClient';
import { isProfileOnboarded } from '../../lib/profile/profileOnboarding';
import { toMessage } from '../../lib/utils/errors';
import { HomeHero } from './HomeHero';

/**
 * Home: narrative landing (Hero, What Makes Different, How It Works, Social Proof).
 * Always render as the canonical "/" destination.
 */
export const Home = () => {
  const feedEnabled = useFeatureFlag('feed');
  const dashboardEnabled = useFeatureFlag('dashboard');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrollMilestonesSeenRef = useRef<Set<number>>(new Set());
  const belowFoldTrackedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<{ id: string } | null>(null);
  /** When session exists, we only redirect to /feed if onboarded; otherwise stay on home. */
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const PRIMARY_VIDEO_SRC = '/assets/video/hero-green-pinky.mp4';
  const FALLBACK_VIDEO_SRC = '/assets/video/hero-bg.mp4';

  const [videoSrc, setVideoSrc] = useState(PRIMARY_VIDEO_SRC);

  // Show text only after the video finishes (or immediately if reduced motion).
  const [showContent, setShowContent] = useState<boolean>(
    prefersReducedMotion ? true : false,
  );

  const [heroPhase, setHeroPhase] = useState<'playing' | 'dimmed'>(() =>
    prefersReducedMotion ? 'dimmed' : 'playing',
  );

  // AUTH: session + onboarding. Redirect to /feed only when onboarded; else stay on home.
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError)
          console.warn('Session check warning:', sessionError.message);

        const user = data.session?.user;
        setSession(user ? { id: user.id } : null);
        if (!user) {
          setOnboarded(null);
          setIsLoading(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, join_reason, participation_style')
          .eq('id', user.id)
          .maybeSingle();
        if (!mounted) return;
        setOnboarded(profile ? isProfileOnboarded(profile) : false);
        setIsLoading(false);
      } catch (err) {
        console.error('Session check failed:', err);
        if (mounted) {
          setError(toMessage(err));
          setOnboarded(null);
          setIsLoading(false);
        }
      }
    };

    void checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession?.user ? { id: newSession.user.id } : null);
        if (!newSession?.user) setOnboarded(null);
        setIsLoading(false);
      },
    );

    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) setIsLoading(false);
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, [isLoading]);

  // When session exists but onboarded is still null (e.g. auth state changed), resolve onboarding.
  useEffect(() => {
    if (!session?.id || onboarded !== null) return;
    let mounted = true;
    void (async () => {
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

  // 1.5x playback improves pacing; respect prefers-reduced-motion
  const setPlaybackRate = useCallback(() => {
    const el = videoRef.current;
    if (el && !prefersReducedMotion) {
      el.playbackRate = 1.5;
    }
  }, [prefersReducedMotion]);

  const handleVideoError = () => {
    // IMPORTANT:
    // Do NOT show the content on error.
    // Swap to fallback video and still wait for onEnded.
    if (videoSrc !== FALLBACK_VIDEO_SRC) {
      setVideoSrc(FALLBACK_VIDEO_SRC);

      // Try to restart playback with the new source.
      requestAnimationFrame(() => {
        const el = videoRef.current;
        if (!el) return;
        try {
          el.load();
          void el.play();
        } catch {
          // If play fails, we still do not reveal content yet.
          // Let the user see the background overlay and the page will remain usable.
        }
      });

      return;
    }

    // If even the fallback video errors, reveal content so the page is not stuck.
    setHeroPhase('dimmed');
    setShowContent(true);
  };

  if (isLoading) {
    return <HomeSkeleton />;
  }

  const postAuthPath = feedEnabled
    ? '/feed'
    : dashboardEnabled
      ? '/dashboard'
      : '/';

  // Signed-in and onboarded users go to the primary enabled surface.
  if (session && onboarded === true) {
    return <Navigate to={postAuthPath} replace />;
  }

  return (
    <>
      <Helmet>
        <title>Business, but weirder. | WRDLNKDN</title>
        <meta
          name="description"
          content="A professional networking space where you don't have to pretend. For people who build, create, and think differently."
        />
        <link rel="canonical" href="https://wrdlnkdn.com" />
        <meta property="og:url" content="https://wrdlnkdn.com" />
        <meta property="og:title" content="Business, but weirder." />
        <meta
          property="og:description"
          content="A professional networking space where you don't have to pretend. For people who build, create, and think differently."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://wrdlnkdn.com/og-image.png" />
        <meta
          property="og:image:alt"
          content="WRDLNKDN - Business, but weirder."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Business, but weirder." />
        <meta
          name="twitter:description"
          content="A professional networking space where you don't have to pretend. For people who build, create, and think differently."
        />
        <meta
          name="twitter:image"
          content="https://wrdlnkdn.com/og-image.png"
        />
      </Helmet>

      <HomeHero
        error={error}
        onClearError={() => setError(null)}
        videoRef={videoRef}
        videoSrc={videoSrc}
        showContent={showContent}
        heroPhase={heroPhase}
        prefersReducedMotion={prefersReducedMotion}
        onLoadedMetadata={setPlaybackRate}
        onCanPlay={setPlaybackRate}
        onVideoEnded={handleVideoEnded}
        onVideoError={handleVideoError}
      />

      <WhatMakesDifferent />
      <HowItWorks />
      <SocialProof />
    </>
  );
};

import { useEffect, useMemo, useRef, useState } from 'react';
import ButtonBase from '@mui/material/ButtonBase';

const VIDEO_EMBED_BASE = 'https://www.youtube.com/embed/Qc4D5W2kuBI';
const VIDEO_POSTER =
  'https://i.ytimg.com/vi_webp/Qc4D5W2kuBI/maxresdefault.webp';

export const WhyWrdlnkdnVideo = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [hasMountedPlayer, setHasMountedPlayer] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [hasUserStarted, setHasUserStarted] = useState(false);

  useEffect(() => {
    if (hasMountedPlayer || typeof window === 'undefined') return;
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.6) return;
        setHasMountedPlayer(true);
        setHasAutoStarted(true);
        observer.disconnect();
      },
      {
        threshold: [0.6, 0.8],
        rootMargin: '0px 0px -10% 0px',
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMountedPlayer]);

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams({
      playsinline: '1',
      rel: '0',
    });

    if (hasAutoStarted || hasUserStarted) {
      params.set('autoplay', '1');
    }

    if (hasAutoStarted && !hasUserStarted) {
      params.set('mute', '1');
    }

    return `${VIDEO_EMBED_BASE}?${params.toString()}`;
  }, [hasAutoStarted, hasUserStarted]);

  const handleManualStart = () => {
    setHasMountedPlayer(true);
    setHasUserStarted(true);
  };

  return (
    <section
      ref={sectionRef}
      className="home-landing__section home-landing__section--video"
      aria-labelledby="why-wrdlnkdn-video-heading"
    >
      <div className="home-landing__container">
        <div className="home-landing__video-section-shell">
          <div className="home-landing__video-section-copy">
            <p className="home-landing__video-section-eyebrow">Why WRDLNKDN</p>
            <h2
              id="why-wrdlnkdn-video-heading"
              className="home-landing__section-title home-landing__section-title--video"
            >
              See the idea in motion
            </h2>
          </div>
          <div className="home-landing__video-frame">
            {hasMountedPlayer ? (
              <iframe
                className="home-landing__video-embed"
                src={iframeSrc}
                title="Why WRDLNKDN video"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <ButtonBase
                component="button"
                className="home-landing__video-preview"
                onClick={handleManualStart}
                aria-label="Play Why WRDLNKDN video"
              >
                <img
                  className="home-landing__video-preview-image"
                  src={VIDEO_POSTER}
                  alt=""
                  loading="lazy"
                />
                <span
                  className="home-landing__video-preview-overlay"
                  aria-hidden="true"
                >
                  <span className="home-landing__video-preview-badge">
                    Why WRDLNKDN
                  </span>
                  <span className="home-landing__video-preview-play">
                    Play video
                  </span>
                </span>
              </ButtonBase>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

import { useState } from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import PlayArrow from '@mui/icons-material/PlayArrow';

const VIDEO_EMBED_BASE = 'https://www.youtube.com/embed/Qc4D5W2kuBI';
/** Local 1280×720 frame — YouTube only exposes ~480×360 for this ID (hq/mq), which looks pixelated scaled up. */
const VIDEO_POSTER_URLS = [
  '/assets/video/why-wrdlnkdn-poster.jpg',
  'https://i.ytimg.com/vi/Qc4D5W2kuBI/hqdefault.jpg',
  'https://i.ytimg.com/vi/Qc4D5W2kuBI/mqdefault.jpg',
] as const;

export const WhyWrdlnkdnVideo = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);

  const handleManualStart = () => {
    setHasStarted(true);
  };

  return (
    <section
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
            {hasStarted ? (
              <iframe
                className="home-landing__video-embed"
                src={`${VIDEO_EMBED_BASE}?playsinline=1&rel=0&autoplay=1`}
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
                  src={VIDEO_POSTER_URLS[posterIndex]}
                  alt=""
                  loading="lazy"
                  onError={() => {
                    setPosterIndex((i) =>
                      i < VIDEO_POSTER_URLS.length - 1 ? i + 1 : i,
                    );
                  }}
                />
                <span
                  className="home-landing__video-preview-overlay"
                  aria-hidden="true"
                >
                  <span className="home-landing__video-preview-play">
                    <PlayArrow
                      className="home-landing__video-preview-play-icon"
                      fontSize="small"
                      aria-hidden
                    />
                    Play
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

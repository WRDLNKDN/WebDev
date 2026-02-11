/**
 * WRDLNKDN bumper: full-screen layered intro/outro for recording or embedding.
 *
 * Layers (back to front):
 * 0. concept-bumper.mp4 (voiceover + video from public/assets/video)
 * 1. Grid background (full)
 * 2. Animated green→pink Weirdling (left)
 * 3. WRDLNKDN wordmark (pops out)
 * 4. "Business, but Weirder." (typing animation)
 */

import './bumperKeyframes.css';

import { Box, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

const CONCEPT_BUMPER_VIDEO = '/assets/video/concept-bumper.mp4';

const TAGLINE = 'Business, but Weirder.';
const TYPING_MS = 80;
const POP_DELAY_MS = 400;
const TAGLINE_START_MS = 800;

export type BumperProps = {
  /** Run typing + pop on mount (default true) */
  autoPlay?: boolean;
  className?: string;
};

export const Bumper = ({ autoPlay = true, className }: BumperProps) => {
  const [typed, setTyped] = useState('');
  const [popVisible, setPopVisible] = useState(!autoPlay);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!autoPlay) return;

    const video = videoRef.current;
    const popTimer = setTimeout(() => setPopVisible(true), POP_DELAY_MS);

    const taglineTimer = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        i += 1;
        setTyped(TAGLINE.slice(0, i));
        if (i >= TAGLINE.length) clearInterval(id);
      }, TYPING_MS);
      return () => clearInterval(id);
    }, TAGLINE_START_MS);

    return () => {
      clearTimeout(popTimer);
      clearTimeout(taglineTimer);
      video?.pause();
    };
  }, [autoPlay]);

  return (
    <Box
      className={className}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Layer 0: concept-bumper.mp4 (voiceover + video) */}
      <Box
        component="video"
        ref={videoRef}
        src={CONCEPT_BUMPER_VIDEO}
        autoPlay
        muted={false}
        loop
        playsInline
        onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />

      {/* Layer 1: Full grid background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'url(/assets/grid-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#05070f',
        }}
      />

      {/* Layer 2: Animated green→pink Weirdling (left); swap asset for green→pink Wonder Woman when ready */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: { xs: '40%', sm: '35%' },
          maxWidth: 420,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, 
            rgba(0, 180, 120, 0.28) 0%, 
            rgba(200, 80, 180, 0.22) 50%,
            rgba(255, 100, 150, 0.18) 100%)`,
          animation: 'bumperLayer2Pulse 4s ease-in-out infinite alternate',
        }}
      >
        <Box
          component="img"
          src="/assets/og_weirdlings/weirdling_1.png"
          alt=""
          aria-hidden
          sx={{
            maxHeight: '70%',
            maxWidth: '80%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(0,200,140,0.4))',
            animation: 'bumperWeirdlingFloat 3s ease-in-out infinite alternate',
          }}
        />
      </Box>

      {/* Layer 3: WRDLNKDN (pops out) */}
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '38%',
          zIndex: 2,
          opacity: popVisible ? 1 : 0,
          transform: popVisible
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.3)',
          transition:
            'opacity 0.5s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <Typography
          component="span"
          sx={{
            color: '#fff',
            fontWeight: 800,
            letterSpacing: '0.04em',
            fontSize: {
              xs: 'clamp(2.5rem, 10vw, 5rem)',
              md: 'clamp(3rem, 8vw, 6rem)',
            },
            lineHeight: 1,
            textShadow:
              '0 0 40px rgba(0,200,140,0.5), 0 4px 24px rgba(0,0,0,0.6)',
          }}
        >
          WRDLNKDN
        </Typography>
      </Box>

      {/* Layer 4: "Business, but Weirder." (typing animation) */}
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '58%',
          transform: 'translate(-50%, -50%)',
          zIndex: 3,
        }}
      >
        <Typography
          component="span"
          sx={{
            color: 'primary.light',
            fontWeight: 600,
            fontStyle: 'italic',
            fontSize: {
              xs: 'clamp(1.25rem, 4vw, 2rem)',
              md: 'clamp(1.5rem, 3vw, 2.25rem)',
            },
            letterSpacing: '0.02em',
            '&::after':
              typed.length < TAGLINE.length
                ? {
                    content: '""',
                    display: 'inline-block',
                    width: 3,
                    height: '1em',
                    ml: 0.25,
                    verticalAlign: 'text-bottom',
                    bgcolor: 'primary.light',
                    animation: 'bumperCaret 0.8s step-end infinite',
                  }
                : {},
          }}
        >
          {typed}
        </Typography>
      </Box>
    </Box>
  );
};

export default Bumper;

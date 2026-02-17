/**
 * WRDLNKDN bumper: full-screen intro/outro. Solid black; centered stack:
 * WRDLNKDN → phonetic (Weird Link-uh-din) → tagline → Weirdling character.
 */

import './bumperKeyframes.css';

import { Box, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

const CONCEPT_BUMPER_VIDEO = '/assets/video/concept-bumper.mp4';

const PHONETIC = '(Weird Link-uh-din)';
const TAGLINE = 'Business, but weirder';
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
  const hasStartedRef = useRef(false);

  const handleCanPlayThrough = useCallback(() => {
    const video = videoRef.current;
    if (!video || !autoPlay || hasStartedRef.current) return;
    hasStartedRef.current = true;
    video.play().catch(() => {});
  }, [autoPlay]);

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
        backgroundColor: '#000',
      }}
    >
      {/* Voiceover video: audio-only (hidden). Playback starts only when canplaythrough to avoid clipping "Business". */}
      <Box
        component="video"
        ref={videoRef}
        src={CONCEPT_BUMPER_VIDEO}
        preload="auto"
        muted={false}
        loop
        playsInline
        onCanPlayThrough={handleCanPlayThrough}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Centered stack: WRDLNKDN → phonetic → tagline → character */}
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={{ xs: 1.5, md: 2 }}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        {/* WRDLNKDN (pops out) */}
        <Box
          sx={{
            opacity: popVisible ? 1 : 0,
            transform: popVisible ? 'scale(1)' : 'scale(0.3)',
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

        {/* Phonetic pronunciation */}
        <Typography
          component="span"
          sx={{
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.12em',
            fontSize: { xs: '0.75rem', md: '0.85rem' },
          }}
        >
          {PHONETIC}
        </Typography>

        {/* "Business, but Weirder." (typing animation) */}
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

        {/* Weirdling character (centered under the words) */}
        <Box
          component="img"
          src="/assets/og_weirdlings/weirdling_1.png"
          alt=""
          aria-hidden
          sx={{
            maxHeight: { xs: 140, md: 200 },
            maxWidth: '80%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(0,200,140,0.4))',
            animation: 'bumperWeirdlingFloat 3s ease-in-out infinite alternate',
          }}
        />
      </Stack>
    </Box>
  );
};

export default Bumper;

import type { RefObject } from 'react';
import { Alert, Box, Container, Grid, Stack, Typography } from '@mui/material';
import { GuestView } from '../../components/home/GuestView';

type HomeHeroProps = {
  error: string | null;
  onClearError: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  showContent: boolean;
  heroPhase: 'playing' | 'dimmed';
  prefersReducedMotion: boolean;
  onLoadedMetadata: () => void;
  onCanPlay: () => void;
  onVideoEnded: () => void;
  onVideoError: () => void;
};

export const HomeHero = ({
  error,
  onClearError,
  videoRef,
  videoSrc,
  showContent,
  heroPhase,
  prefersReducedMotion,
  onLoadedMetadata,
  onCanPlay,
  onVideoEnded,
  onVideoError,
}: HomeHeroProps) => (
  <Box
    component="main"
    data-testid="signed-out-landing"
    sx={{
      position: 'relative',
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      overflowX: 'hidden',
      overflowY: 'visible',
    }}
  >
    <Box
      component="video"
      ref={videoRef}
      aria-hidden="true"
      autoPlay
      muted
      loop={false}
      playsInline
      poster="/assets/video/hero-bg-poster.jpg"
      onLoadedMetadata={onLoadedMetadata}
      onCanPlay={onCanPlay}
      onEnded={onVideoEnded}
      onError={onVideoError}
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 0,
        opacity: heroPhase === 'dimmed' && !prefersReducedMotion ? 0 : 1,
        transition:
          heroPhase === 'dimmed' && !prefersReducedMotion
            ? 'opacity 1s ease-out'
            : 'none',
      }}
      src={videoSrc}
    />

    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor:
          heroPhase === 'dimmed'
            ? 'rgba(5, 7, 15, 0.92)'
            : 'rgba(5, 7, 15, 0.6)',
        zIndex: 1,
        pointerEvents: 'none',
        transition: 'background-color 1s ease-out',
      }}
    />

    <Container
      maxWidth="lg"
      sx={{
        position: 'relative',
        zIndex: 2,
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0)' : 'translateY(16px)',
        transition: showContent
          ? 'opacity 400ms ease-out, transform 400ms ease-out'
          : 'none',
        pt: { xs: 3, sm: 4, md: 5 },
        pb: 1,
      }}
    >
      <Grid
        container
        spacing={4}
        alignItems="center"
        justifyContent="center"
        sx={{ textAlign: 'center' }}
      >
        <Grid
          size={{ xs: 12 }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {error && (
            <Alert severity="error" onClose={onClearError} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography
            component="h1"
            variant="h1"
            sx={{
              color: '#FFFFFF',
              fontWeight: 700,
              letterSpacing: '0.02em',
              fontSize: { xs: '3rem', sm: '3.5rem', md: '4rem' },
              lineHeight: 1.1,
              textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            }}
          >
            WRDLNKDN
          </Typography>

          <Stack spacing={0.75} sx={{ maxWidth: 420, alignItems: 'center' }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                fontStyle: 'italic',
                letterSpacing: '0.04em',
                fontSize: { xs: '1.375rem', sm: '1.5rem', md: '1.625rem' },
                lineHeight: 1.25,
              }}
            >
              (Weird Link-uh-din)
            </Typography>
            <Typography
              variant="h5"
              sx={{ color: 'primary.main', fontWeight: 600 }}
            >
              Business, but weirder.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              A networking space for people who think differently
            </Typography>
          </Stack>
        </Grid>

        <Grid
          size={{ xs: 12 }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <GuestView buttonsOnly />
        </Grid>
      </Grid>
    </Container>
  </Box>
);

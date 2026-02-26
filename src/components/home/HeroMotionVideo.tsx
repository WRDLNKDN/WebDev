import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { Box, IconButton, Typography } from '@mui/material';
import { useCallback, useRef, useState } from 'react';

const DEFAULT_PLAYBACK_RATE = 1.5;

/**
 * Hero motion element: "Greenling to Pinkling" video.
 * Top-left, plays once on load, muted by default. User can unmute.
 * Place video at public/assets/video/hero-motion.mp4 (or greenling-pinkling.mp4).
 */
const HERO_VIDEO_SRC = '/assets/video/hero-motion.mp4';

export const HeroMotionVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [showPlayWithAudio, setShowPlayWithAudio] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  }, []);

  const handleEnded = useCallback(() => {
    setShowPlayWithAudio(true);
  }, []);

  const handlePlayWithAudio = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = false;
    setMuted(false);
    setShowPlayWithAudio(false);
    void v.play();
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = DEFAULT_PLAYBACK_RATE;
  }, []);

  if (loadFailed) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          width: { xs: '40%', sm: '35%', md: '28%' },
          maxWidth: 320,
          aspectRatio: '1',
          borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.08)',
          background:
            'linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(236,64,122,0.15) 100%)',
        }}
        aria-hidden
      />
    );
  }

  return (
    <Box
      component="div"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
        width: { xs: '40%', sm: '35%', md: '28%' },
        maxWidth: 320,
        aspectRatio: '1',
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <video
        ref={videoRef}
        src={HERO_VIDEO_SRC}
        playsInline
        muted
        loop={false}
        autoPlay
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setLoadFailed(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        aria-label="Hero motion: Greenling to Pinkling"
      />
      {/* Unmute / mute control */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          zIndex: 2,
        }}
      >
        <IconButton
          size="small"
          onClick={toggleMute}
          onFocus={(e) => e.stopPropagation()}
          aria-label={muted ? 'Unmute video' : 'Mute video'}
          sx={{
            color: 'rgba(255,255,255,0.9)',
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
        >
          {muted ? (
            <VolumeOffIcon fontSize="small" />
          ) : (
            <VolumeUpIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
      {/* Play with audio (after first play) - MVP Should */}
      {showPlayWithAudio && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.4)',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mb: 1 }}
            >
              Play with audio
            </Typography>
            <IconButton
              size="small"
              onClick={handlePlayWithAudio}
              aria-label="Play with audio"
              sx={{
                color: 'rgba(255,255,255,0.95)',
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              }}
            >
              <VolumeUpIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
};

import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignup } from '../../context/useSignup';

export const CompleteStep = () => {
  const navigate = useNavigate();
  const { resetSignup } = useSignup();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [bumperFinished, setBumperFinished] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 1.2;
    video.defaultPlaybackRate = 1.2;
    video.muted = false;
    video.volume = 1;

    const playPromise = video.play();
    void playPromise?.catch(() => {
      setBumperFinished(true);
    });
  }, []);

  const handleGoHome = () => {
    resetSignup();
    navigate('/feed', { replace: true });
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              width: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'black',
            }}
          >
            <Box
              ref={videoRef}
              component="video"
              autoPlay
              playsInline
              preload="auto"
              controls={bumperFinished}
              onEnded={() => setBumperFinished(true)}
              onError={() => setBumperFinished(true)}
              sx={{
                display: 'block',
                width: '100%',
                maxHeight: { xs: 260, md: 340 },
                objectFit: 'cover',
              }}
            >
              <source src="/assets/video/concept-bumper.mp4" type="video/mp4" />
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              You are all set
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Your account has been created and your profile is now live in the
              member directory.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleGoHome}
            fullWidth
            disabled={!bumperFinished}
          >
            {bumperFinished ? 'Continue to Feed' : 'Playing bumper...'}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

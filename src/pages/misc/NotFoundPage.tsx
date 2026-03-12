import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GLASS_CARD, SIGNUP_BG } from '../../theme/candyStyles';

type NotFoundWeirdling = {
  name: string;
  message: string;
  imageSrc: string;
  accent: string;
  glow: string;
};

const NOT_FOUND_WEIRDLINGS: NotFoundWeirdling[] = [
  {
    name: 'Wizard Weirdling',
    message: 'Wrong portal',
    imageSrc: '/assets/og_weirdlings/weirdling_7.png',
    accent: '#7c4dff',
    glow: 'rgba(124, 77, 255, 0.28)',
  },
  {
    name: 'Gym Weirdling',
    message: 'Page skipped leg day',
    imageSrc: '/assets/og_weirdlings/weirdling_3.png',
    accent: '#ff8a3d',
    glow: 'rgba(255, 138, 61, 0.24)',
  },
  {
    name: 'Rainbow Weirdling',
    message: 'Page wandered off',
    imageSrc: '/assets/og_weirdlings/weirdling_1.png',
    accent: '#ff5ab3',
    glow: 'rgba(255, 90, 179, 0.26)',
  },
  {
    name: 'Builder Weirdling',
    message: 'Page under construction',
    imageSrc: '/assets/og_weirdlings/weirdling_4.png',
    accent: '#3dc8ff',
    glow: 'rgba(61, 200, 255, 0.22)',
  },
  {
    name: 'Science Weirdling',
    message: 'Experiment failed',
    imageSrc: '/assets/og_weirdlings/weirdling_5.png',
    accent: '#8fd6ff',
    glow: 'rgba(143, 214, 255, 0.24)',
  },
];

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.floor(Math.random() * NOT_FOUND_WEIRDLINGS.length),
  );
  const selectedWeirdling = NOT_FOUND_WEIRDLINGS[selectedIndex];
  const availableVariants = useMemo(
    () =>
      NOT_FOUND_WEIRDLINGS.map((weirdling, index) => ({
        ...weirdling,
        index,
      })),
    [],
  );

  return (
    <Box
      sx={{
        ...SIGNUP_BG,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at top, ${selectedWeirdling.glow} 0%, transparent 42%)`,
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            ...GLASS_CARD,
            p: { xs: 3, sm: 5, md: 6 },
            textAlign: 'center',
            zIndex: 1,
            position: 'relative',
            boxShadow: `0 18px 60px ${selectedWeirdling.glow}`,
          }}
        >
          <Stack spacing={{ xs: 3, sm: 4 }} alignItems="center">
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '4.5rem', sm: '6rem' },
                fontWeight: 900,
                opacity: 0.18,
                letterSpacing: -5,
              }}
            >
              404
            </Typography>

            <Box
              sx={{
                width: '100%',
                maxWidth: 280,
                p: 1.5,
                borderRadius: 5,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: `0 0 0 1px ${selectedWeirdling.glow}`,
              }}
            >
              <Box
                component="img"
                src={selectedWeirdling.imageSrc}
                alt={selectedWeirdling.name}
                sx={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  filter: 'drop-shadow(0 22px 40px rgba(0,0,0,0.35))',
                }}
              />
            </Box>

            <Box sx={{ width: '100%' }}>
              <Chip
                label={selectedWeirdling.name}
                sx={{
                  mb: 1.25,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: 800,
                  border: `1px solid ${selectedWeirdling.accent}`,
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  letterSpacing: -1,
                  mb: 1,
                  fontSize: { xs: '2rem', sm: '2.5rem' },
                  background: `linear-gradient(45deg, #fff 25%, ${selectedWeirdling.accent} 95%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {selectedWeirdling.message}
              </Typography>
              <Typography
                variant="body1"
                sx={{ opacity: 0.78, maxWidth: 420, mx: 'auto' }}
              >
                This page is missing, moved, or never made it through the portal
                in one piece.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: 'wrap', justifyContent: 'center', maxWidth: 520 }}
            >
              {availableVariants.map((weirdling) => (
                <Button
                  key={weirdling.name}
                  variant={
                    weirdling.index === selectedIndex ? 'contained' : 'text'
                  }
                  size="small"
                  onClick={() => setSelectedIndex(weirdling.index)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 1.5,
                    color:
                      weirdling.index === selectedIndex ? '#0b1020' : '#fff',
                    bgcolor:
                      weirdling.index === selectedIndex
                        ? weirdling.accent
                        : 'rgba(255,255,255,0.05)',
                    '&:hover': {
                      bgcolor:
                        weirdling.index === selectedIndex
                          ? weirdling.accent
                          : 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  {weirdling.name}
                </Button>
              ))}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{
                  bgcolor: '#FFFFFF',
                  color: '#000',
                  '&:hover': { bgcolor: '#e0e0e0' },
                }}
              >
                Return to Dashboard
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/')}
                sx={{
                  color: '#FFFFFF',
                  borderColor: 'rgba(141,188,229,0.38)',
                  '&:hover': { borderColor: '#FFFFFF' },
                }}
              >
                Back to Home
              </Button>
            </Stack>

            <Typography
              variant="caption"
              sx={{
                opacity: 0.4,
                letterSpacing: 2,
              }}
            >
              PAGE_NOT_FOUND
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

// Default export for lazy loading
export default NotFoundPage;

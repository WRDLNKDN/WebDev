import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGlassCard, SIGNUP_BG } from '../../theme/candyStyles';

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
  const theme = useTheme();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.floor(Math.random() * NOT_FOUND_WEIRDLINGS.length),
  );
  const selectedWeirdling = NOT_FOUND_WEIRDLINGS[selectedIndex];

  return (
    <Box
      sx={{
        ...SIGNUP_BG,
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100%',
        py: { xs: 3, sm: 4, md: 6 },
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
      <Container
        maxWidth={false}
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 'min(1120px, calc(100vw - 32px))',
          minHeight: {
            xs: 'calc(100dvh - 180px)',
            sm: 'calc(100dvh - 220px)',
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Paper
          elevation={24}
          sx={{
            ...getGlassCard(theme),
            width: '100%',
            maxWidth: 980,
            px: { xs: 2.5, sm: 4, md: 5.5 },
            py: { xs: 3.5, sm: 4.5, md: 5.25 },
            borderRadius: { xs: 4, md: 5 },
            textAlign: { xs: 'center', md: 'left' },
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 18px 60px ${selectedWeirdling.glow}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background:
                theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, rgba(0,0,0,0.02), rgba(0,0,0,0) 42%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 42%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Stack spacing={{ xs: 3, sm: 4, md: 4.5 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '4.4rem', sm: '5.8rem', md: '7rem' },
                fontWeight: 900,
                opacity: 0.18,
                letterSpacing: { xs: -4, md: -6 },
                lineHeight: 0.9,
                alignSelf: { xs: 'center', md: 'flex-start' },
              }}
            >
              404
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(0, 1.05fr) minmax(320px, 0.95fr)',
                },
                gap: { xs: 3, sm: 4, md: 5 },
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Stack
                spacing={{ xs: 2.25, sm: 2.75, md: 3 }}
                sx={{ order: { xs: 2, md: 1 }, minWidth: 0 }}
              >
                <Box>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: -1.2,
                      mb: 1.25,
                      fontSize: {
                        xs: '2.1rem',
                        sm: '2.5rem',
                        md: '3rem',
                      },
                      lineHeight: 1.02,
                      background: `linear-gradient(45deg, #fff 18%, ${selectedWeirdling.accent} 96%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {selectedWeirdling.message}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      opacity: 0.8,
                      maxWidth: { xs: 560, md: 460 },
                      mx: { xs: 'auto', md: 0 },
                      fontSize: { xs: '1rem', sm: '1.05rem' },
                      lineHeight: 1.6,
                    }}
                  >
                    This page is missing, moved, or never made it through the
                    portal in one piece. Let&apos;s get you back to somewhere
                    useful.
                  </Typography>
                </Box>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{
                    width: '100%',
                    justifyContent: { md: 'flex-start' },
                    '& > *': {
                      minWidth: { sm: 190 },
                    },
                  }}
                >
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
              </Stack>

              <Stack
                spacing={2}
                alignItems="center"
                sx={{ order: { xs: 1, md: 2 } }}
              >
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: { xs: 320, sm: 360, md: 400 },
                    p: { xs: 1.5, sm: 1.75, md: 2 },
                    borderRadius: { xs: 5, md: 6 },
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
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  justifyContent="center"
                  sx={{ maxWidth: 440 }}
                >
                  {NOT_FOUND_WEIRDLINGS.map((weirdling, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <Button
                        key={weirdling.name}
                        type="button"
                        variant={isSelected ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setSelectedIndex(index)}
                        aria-pressed={isSelected}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 999,
                          px: 1.5,
                          py: 0.65,
                          bgcolor: isSelected
                            ? weirdling.accent
                            : 'rgba(255,255,255,0.02)',
                          color: isSelected ? '#08111f' : '#fff',
                          borderColor: isSelected
                            ? weirdling.accent
                            : 'rgba(141,188,229,0.3)',
                          boxShadow: isSelected
                            ? `0 10px 24px ${weirdling.glow}`
                            : 'none',
                          '&:hover': {
                            borderColor: weirdling.accent,
                            bgcolor: isSelected
                              ? weirdling.accent
                              : 'rgba(255,255,255,0.06)',
                          },
                        }}
                      >
                        {weirdling.name}
                      </Button>
                    );
                  })}
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

// Default export for lazy loading
export default NotFoundPage;

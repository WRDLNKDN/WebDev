import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  GRID_CARD_BG,
  HERO_CARD_BG,
  MISSION_SECTION_BG,
  SYNERGY_BG,
} from '../theme/candyStyles';

// 1. UTILITY SECTOR
const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Request failed';
};

const MISSION_DATA = [
  {
    title: 'Our Vision',
    body: 'We envision a world where professional communities are open and built around people rather than gatekeeping.',
  },
  {
    title: 'Our Team',
    body: 'We are a fully volunteer, open-source software community working through shared effort.',
  },
  {
    title: 'Our Pride',
    body: 'WRDLNKDN is shaped by people who choose authenticity over conformity.',
  },
];

export const Home = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) setError(toMessage(sessionError));
      setSession(data.session ?? null);
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* 2. HERO SECTOR */}
      <Box
        component="main"
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', py: 8 }}>
          <Container maxWidth="md">
            <Paper
              elevation={24}
              sx={{
                p: { xs: 4, md: 6 },
                borderRadius: 4,
                bgcolor: HERO_CARD_BG,
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
              }}
            >
              <Stack spacing={4} alignItems="center">
                <Box>
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                      fontWeight: 900,
                      mb: 0.5,
                      color: 'white',
                      letterSpacing: 2,
                    }}
                  >
                    WRDLNKDN
                  </Typography>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      mb: 3,
                      fontWeight: 400,
                      opacity: 0.6,
                      color: 'white',
                    }}
                  >
                    (Weird Link-uh-din)
                  </Typography>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{ opacity: 0.9, fontWeight: 300, color: 'white' }}
                  >
                    {session ? (
                      <>
                        Welcome back,{' '}
                        <Box
                          component="span"
                          sx={{ color: 'primary.main', fontWeight: 'bold' }}
                        >
                          Verified Generalist
                        </Box>
                        .
                      </>
                    ) : (
                      <>
                        Professional networking, but{' '}
                        <Box
                          component="span"
                          sx={{ color: 'primary.main', fontWeight: 'bold' }}
                        >
                          human
                        </Box>
                        .
                      </>
                    )}
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {error}
                  </Alert>
                )}

                <Button
                  component={RouterLink}
                  to={session ? '/dashboard' : '/directory'}
                  variant="contained"
                  size="large"
                  sx={{ px: 6, py: 1.5, borderRadius: 2, fontSize: '1.2rem' }}
                >
                  {session ? 'Enter Your Dashboard' : 'Explore The Guild'}
                </Button>
              </Stack>
            </Paper>
          </Container>
        </Box>

        {/* 3. MISSION SECTOR */}
        <Box sx={{ bgcolor: MISSION_SECTION_BG, py: 8 }}>
          <Container maxWidth="lg">
            <Stack
              component="section"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 4,
              }}
            >
              {MISSION_DATA.map((item, i) => (
                <Paper
                  key={i}
                  sx={{
                    p: 3,
                    bgcolor: GRID_CARD_BG,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <Stack spacing={2}>
                    <Typography
                      variant="h6"
                      component="h3"
                      color="primary.light"
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.7, color: 'white' }}
                    >
                      {item.body}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Container>
        </Box>
      </Box>

      {/* 4. FOOTER SECTOR */}
      <Box
        component="footer"
        sx={{
          py: 3,
          bgcolor: 'black',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="body2"
            sx={{ color: 'grey.500', textAlign: 'center' }}
          >
            © {new Date().getFullYear()} WRDLNKDN. Built by Humans.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

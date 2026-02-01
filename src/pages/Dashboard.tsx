import EditIcon from '@mui/icons-material/Edit';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// HIGH-FIDELITY ASSETS
const SYNERGY_BG = 'url("/assets/background.svg")';
const CARD_BG = 'rgba(30, 30, 30, 0.65)'; // Slightly more transparent for dashboard feel

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  // 1. Auth Guard (Human OS Security Protocol)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/'); // Eject if not authenticated
      } else {
        setSession(data.session);
      }
    });
  }, [navigate]);

  if (!session) return null; // Prevent flash of unauth content

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        pt: 12, // Account for fixed header if we add one later
        pb: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* 1. IDENTITY HEADER (The "Head's Up Display") */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            bgcolor: CARD_BG,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            mb: 4,
            position: 'relative',
          }}
        >
          {/* Status Bubble (The "Expression Layer") */}
          <Chip
            label="⚡ Charging: Focused on MVP"
            color="primary"
            sx={{
              position: 'absolute',
              top: -16,
              right: 32,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={4}
            alignItems="center"
          >
            {/* Avatar & Music */}
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={session.user.user_metadata.avatar_url}
                alt={session.user.user_metadata.full_name}
                sx={{
                  width: 140,
                  height: 140,
                  border: '4px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              />
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  border: '1px solid rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'primary.main' },
                }}
                aria-label="Play Profile Theme"
              >
                <PlayCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Profile Data */}
            <Box sx={{ flexGrow: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {session.user.user_metadata.full_name || 'Verified Generalist'}
              </Typography>
              <Typography
                variant="h6"
                color="primary.light"
                sx={{ mb: 2, fontWeight: 500 }}
              >
                Full Stack Developer | System Architect
              </Typography>

              {/* PATCH: Escaped Quotes for JSX Compliance */}
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 600, mx: { xs: 'auto', md: 0 } }}
              >
                &quot;Building the Human OS. Prioritizing authenticity over
                engagement metrics.&quot;
              </Typography>
            </Box>

            {/* Actions */}
            <Stack spacing={2}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
              >
                Edit Profile
              </Button>
              <Button
                variant="text"
                startIcon={<SettingsIcon />}
                sx={{ color: 'text.secondary' }}
              >
                Settings
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* 2. THE CAROUSEL (The "Portfolio Layer") */}
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, pl: 2 }}>
          Portfolio Frame
        </Typography>

        {/* MVP Carousel: Horizontal Scroll Stack */}
        <Stack
          direction="row"
          spacing={3}
          sx={{
            overflowX: 'auto',
            pb: 4, // Space for scrollbar
            scrollSnapType: 'x mandatory',
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
            },
          }}
        >
          {/* Card 1: Resume */}
          <Paper
            sx={{
              minWidth: 320,
              height: 400,
              p: 3,
              borderRadius: 3,
              bgcolor: CARD_BG,
              border: '1px solid rgba(255,255,255,0.1)',
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6">Resume.pdf</Typography>
            <Button size="small" sx={{ mt: 2 }}>
              View Document
            </Button>
          </Paper>

          {/* Card 2: Video Embed */}
          <Paper
            sx={{
              minWidth: 320,
              height: 400,
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'black',
              border: '1px solid rgba(255,255,255,0.1)',
              scrollSnapAlign: 'start',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">Video Placeholder</Typography>
          </Paper>

          {/* Card 3: Add New */}
          <Paper
            sx={{
              minWidth: 320,
              height: 400,
              borderRadius: 3,
              border: '2px dashed rgba(255,255,255,0.2)',
              bgcolor: 'transparent',
              scrollSnapAlign: 'start',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(255,255,255,0.02)',
              },
            }}
          >
            <Typography color="text.secondary">+ Add Portfolio Item</Typography>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

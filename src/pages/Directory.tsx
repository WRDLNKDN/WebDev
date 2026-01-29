import {
  Avatar,
  Box,
  Chip,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getContrastColor } from '../utils/contrast';

// Constants from our Human OS design system
const SYNERGY_BG = 'url("/assets/background.svg")';
const CARD_BG = 'rgba(30, 30, 30, 0.7)'; // Slightly more transparent for the grid
const TEXT_COLOR = getContrastColor(CARD_BG);

interface Profile {
  id: string;
  handle: string;
  display_name?: string;
  bio?: string;
  skills?: string[];
  avatar_url?: string;
  created_at: string;
  geek_creds: string[] | null;
  nerd_creds: unknown;
  pronouns: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  socials: unknown;
  status: string;
  updated_at: string;
}

export const Directory = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      // Logic Layer: Only fetch approved 'Verified Generalists'
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved');

      if (!error && data) {
        setProfiles(data as Profile[]);
      }
      setLoading(false);
    };
    void fetchProfiles();
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        pt: 12,
        pb: 8,
      }}
    >
      <Container maxWidth="lg" component="main">
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontWeight: 900, color: 'white', mb: 1 }}
          >
            The Guild
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 300 }}
          >
            Verified Generalists & High-Performance Humans.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {loading
            ? // Skeleton State: Preventing 'Efficiency Traps' by showing load progress
              [...Array(6)].map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <Skeleton
                    variant="rectangular"
                    height={250}
                    sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)' }}
                  />
                </Grid>
              ))
            : profiles.map((profile) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={profile.id}>
                  <Paper
                    elevation={12}
                    sx={{
                      p: 3,
                      height: '100%',
                      borderRadius: 4,
                      bgcolor: CARD_BG,
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-5px)' },
                    }}
                  >
                    <Stack spacing={2} alignItems="center" textAlign="center">
                      <Avatar
                        src={profile.avatar_url}
                        sx={{
                          width: 80,
                          height: 80,
                          border: '2px solid' + TEXT_COLOR,
                        }}
                      />
                      <Box>
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 'bold', color: TEXT_COLOR }}
                        >
                          {profile.display_name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'primary.main', fontWeight: 'bold' }}
                        >
                          @{profile.handle}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: TEXT_COLOR,
                          opacity: 0.8,
                          minHeight: '3em',
                        }}
                      >
                        {profile.bio || "This human hasn't written a bio yet."}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        justifyContent="center"
                        useFlexGap
                      >
                        {profile.skills?.map((skill) => (
                          <Chip
                            key={skill}
                            label={skill}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.1)',
                              color: TEXT_COLOR,
                              border: '1px solid rgba(255,255,255,0.2)',
                            }}
                          />
                        ))}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
        </Grid>
      </Container>
    </Box>
  );
};

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { PortfolioItem } from '../types/portfolio';
import type { DashboardProfile, NerdCreds } from '../types/profile';
// ASSETS
const SYNERGY_BG = 'url("/assets/background.svg")';
const CARD_BG = 'rgba(30, 30, 30, 0.65)';

// STYLES
const CANDY_SUCCESS = {
  background: 'rgba(0, 20, 0, 0.3)',
  backdropFilter: 'blur(4px)',
  border: '2px dashed #00e676',
  color: '#00e676',
  boxShadow: '0 0 15px rgba(0, 255, 0, 0.05)',
  transition: 'all 0.3s',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    borderStyle: 'solid',
    borderColor: '#69f0ae',
    background: 'linear-gradient(160deg, #00e676 0%, #00a152 100%)',
    color: 'white',
    boxShadow: `0 0 40px rgba(0, 255, 100, 0.6)`,
  },
};

const CANDY_BLUEY = {
  background: 'rgba(0, 20, 40, 0.4)',
  backdropFilter: 'blur(4px)',
  border: '2px solid rgba(66, 165, 245, 0.5)',
  color: '#42a5f5',
  boxShadow: '0 0 15px rgba(33, 150, 243, 0.1)',
  transition: 'all 0.3s',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    borderColor: '#90caf9',
    background: 'linear-gradient(160deg, #42a5f5 0%, #1565c0 100%)',
    color: 'white',
    boxShadow: `0 0 40px rgba(33, 150, 243, 0.6)`,
  },
};

const safeStr = (val: unknown, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return fallback;
};

export const LandingPage = () => {
  const { handle } = useParams<{ handle: string }>(); // Grab the handle from the URL
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setLoading(true);

        // 1. Prepare the Profile Query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any).from('profiles').select('*');

        if (handle) {
          // System Audit: Hunt for the specific vanity handle
          query = query.eq('handle', handle);
        } else {
          // Fallback: Just grab the primary profile (Pathological Homeostasis)
          query = query.limit(1);
        }

        const { data: rawData, error: profileError } = await query.single();

        if (profileError) throw profileError;

        // ASSERTION: We know this is a DashboardProfile
        const profileData = rawData as DashboardProfile;

        // Safe Creds parsing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawCreds = (profileData as any).nerd_creds;
        const safeNerdCreds =
          rawCreds && typeof rawCreds === 'object'
            ? (rawCreds as unknown as NerdCreds)
            : {};

        setProfile({ ...profileData, nerd_creds: safeNerdCreds });

        // 2. Fetch Projects using the ID we just found
        if (profileData?.id) {
          const { data: projectsData, error: projectsError } =
            await // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any)
              .from('portfolio_items')
              .select('*')
              .eq('owner_id', profileData.id)
              .order('created_at', { ascending: false });

          if (projectsError) throw projectsError;
          setProjects((projectsData || []) as PortfolioItem[]);
        }
      } catch (err) {
        console.error('Public Data Load Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
    // Dependency Array: Re-run if the handle in the URL changes
  }, [handle]);

  if (loading) return <Box sx={{ minHeight: '100vh', bgcolor: '#121212' }} />;
  if (!profile)
    return (
      <Box sx={{ p: 4, color: 'white' }}>System Offline. No Profile Found.</Box>
    );

  // Data Sanitization
  const displayName = safeStr(profile.display_name, 'Verified Generalist');
  const tagline = safeStr(profile.tagline, 'Full Stack Developer');
  const avatarUrl = safeStr(profile.avatar);
  const creds = profile.nerd_creds as Record<string, unknown>;
  const statusEmoji = safeStr(creds.status_emoji, '⚡');
  const statusMessage = safeStr(creds.status_message, 'Online');
  const bio = safeStr(creds.bio, 'System Architect');

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        pt: 8,
        pb: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* 1. IDENTITY HEADER */}
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
          <Chip
            label={`${statusEmoji} ${statusMessage}`}
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
            <Avatar
              src={avatarUrl}
              alt={displayName}
              sx={{
                width: 140,
                height: 140,
                border: '4px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            />
            <Box sx={{ flexGrow: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography
                variant="h3"
                component="h1"
                sx={{ fontWeight: 700, mb: 1 }}
              >
                {displayName}
              </Typography>
              <Typography
                variant="h6"
                color="primary.light"
                sx={{ mb: 2, fontWeight: 500 }}
              >
                {tagline}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 600, mx: { xs: 'auto', md: 0 } }}
              >
                {bio}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* 2. THE CAROUSEL */}
        <Typography
          variant="h5"
          component="h2"
          sx={{ mb: 3, fontWeight: 600, pl: 2 }}
        >
          Portfolio Frame
        </Typography>
        <Stack
          direction="row"
          spacing={3}
          sx={{
            overflowX: 'auto',
            py: 4,
            px: 2,
            scrollSnapType: 'x mandatory',
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
            },
          }}
        >
          {/* A. The Resume Card */}
          {profile.resume_url && (
            <Paper
              sx={{
                minWidth: 320,
                height: 400,
                borderRadius: 3,
                scrollSnapAlign: 'start',
                ...CANDY_SUCCESS,
              }}
            >
              <CheckCircleOutlineIcon
                sx={{
                  fontSize: 60,
                  mb: 2,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}
              />
              <Typography variant="h6" fontWeight={800} letterSpacing={1}>
                RESUME.PDF
              </Typography>
              <Button
                variant="outlined"
                href={profile.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View Document (opens in new tab)"
                sx={{
                  mt: 2,
                  color: 'inherit',
                  borderColor: 'currentColor',
                  backdropFilter: 'blur(4px)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                }}
              >
                View Document
              </Button>
            </Paper>
          )}

          {/* B. The Project Loop */}
          {projects.map((project) => (
            <Paper
              key={project.id}
              sx={{
                minWidth: 320,
                maxWidth: 320,
                height: 400,
                borderRadius: 3,
                scrollSnapAlign: 'start',
                ...CANDY_BLUEY,
              }}
            >
              <Box
                sx={{
                  height: 200,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  position: 'relative',
                }}
              >
                {project.image_url ? (
                  <Box
                    component="img"
                    src={project.image_url}
                    alt={project.title || 'Project image'}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                    }}
                  >
                    <Typography variant="caption">No Signal</Typography>
                  </Box>
                )}
              </Box>
              <Box
                sx={{
                  p: 3,
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight={700}
                  noWrap
                  sx={{ color: 'inherit' }}
                >
                  {project.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mb: 2,
                    flexGrow: 1,
                    opacity: 0.9,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {project.description}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 2, overflow: 'hidden' }}
                >
                  {(project.tech_stack || []).slice(0, 3).map((tech) => (
                    <Chip
                      key={tech}
                      label={tech}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 24,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'inherit',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                  ))}
                </Stack>
                {project.project_url && (
                  <Button
                    href={project.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${project.title || 'Project'} (opens in new tab)`}
                    size="small"
                    endIcon={<OpenInNewIcon />}
                    sx={{
                      alignSelf: 'flex-start',
                      color: 'inherit',
                      borderColor: 'currentColor',
                      opacity: 0.8,
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    View Project
                  </Button>
                )}
              </Box>
            </Paper>
          ))}
        </Stack>
      </Container>
    </Box>
  );
};

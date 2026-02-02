import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
import { AddProjectDialog } from '../components/portfolio/AddProjectDialog';
import { EditProfileDialog } from '../components/profile/EditProfileDialog';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabaseClient';
import type { PortfolioItem } from '../types/portfolio';

// HIGH-FIDELITY ASSETS
const SYNERGY_BG = 'url("/assets/profile-bg.png")';
const CARD_BG = 'rgba(30, 30, 30, 0.65)';

// 1. HAZARD RED (Empty State)
const CANDY_HAZARD = {
  background: 'rgba(20, 0, 0, 0.3)',
  backdropFilter: 'blur(4px)',
  border: '2px dashed #ff4d4d',
  color: '#ff4d4d',
  boxShadow: '0 0 15px rgba(255, 0, 0, 0.05)',
  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative',

  '&:hover': {
    transform: 'scale(1.02) translateY(-4px)',
    borderStyle: 'solid',
    borderColor: '#ff9999',
    background: 'linear-gradient(160deg, #ff4d4d 0%, #b30000 100%)',
    color: 'white',
    boxShadow: `0 0 40px rgba(255, 0, 0, 0.6), inset 2px 2px 6px rgba(255,255,255,0.4)`,
  },
  '&:active': {
    transform: 'scale(0.98) translateY(2px)',
    boxShadow: 'inset 4px 4px 15px rgba(0,0,0,0.5)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    background:
      'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  '&:hover::after': { opacity: 1 },
};

// 2. SUCCESS GREEN (Resume Exists)
const CANDY_SUCCESS = {
  background: 'rgba(0, 20, 0, 0.3)',
  backdropFilter: 'blur(4px)',
  border: '2px dashed #00e676',
  color: '#00e676',
  boxShadow: '0 0 15px rgba(0, 255, 0, 0.05)',
  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative',

  '&:hover': {
    transform: 'scale(1.02) translateY(-4px)',
    borderStyle: 'solid',
    borderColor: '#69f0ae',
    background: 'linear-gradient(160deg, #00e676 0%, #00a152 100%)',
    color: 'white',
    boxShadow: `0 0 40px rgba(0, 255, 100, 0.6), inset 2px 2px 6px rgba(255,255,255,0.4)`,
  },
  '&:active': {
    transform: 'scale(0.98) translateY(2px)',
    boxShadow: 'inset 4px 4px 15px rgba(0,0,0,0.5)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    background:
      'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  '&:hover::after': { opacity: 1 },
};

// 3. BLUEY (Project Content)
const CANDY_BLUEY = {
  background: 'rgba(0, 20, 40, 0.4)', // Deep Blue Tint
  backdropFilter: 'blur(4px)',
  border: '2px solid rgba(66, 165, 245, 0.5)', // "Bluey" Blue Border (Solid but faint)
  color: '#42a5f5', // Matching text color
  boxShadow: '0 0 15px rgba(33, 150, 243, 0.1)',

  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  overflow: 'hidden',
  position: 'relative',

  '&:hover': {
    transform: 'scale(1.02) translateY(-4px)',
    borderColor: '#90caf9', // Lighter Blue on hover
    // The "Heeler" Gradient: Light Blue to Deep Blue
    background: 'linear-gradient(160deg, #42a5f5 0%, #1565c0 100%)',
    color: 'white',
    boxShadow: `0 0 40px rgba(33, 150, 243, 0.6), inset 2px 2px 6px rgba(255,255,255,0.4)`,
  },
  '&:active': {
    transform: 'scale(0.98) translateY(2px)',
    boxShadow: 'inset 4px 4px 15px rgba(0,0,0,0.5)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    background:
      'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  '&:hover::after': { opacity: 1 },
};

const safeStr = (val: unknown, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return fallback;
};

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/');
      } else {
        setSession(data.session);
      }
    });
  }, [navigate]);

  const {
    profile,
    projects,
    loading,
    updateProfile,
    uploadAvatar,
    addProject,
    uploadResume,
  } = useProfile();

  if (!session) return null;

  const rawName = profile?.display_name || session.user.user_metadata.full_name;
  const displayName = safeStr(rawName, 'Verified Generalist');
  const tagline = safeStr(
    profile?.tagline,
    'Full Stack Developer | System Architect',
  );
  const avatarUrl = safeStr(
    profile?.avatar || session.user.user_metadata.avatar_url,
  );

  const creds = profile?.nerd_creds || {};
  const safeCreds = creds as Record<string, unknown>;
  const statusEmoji = safeStr(safeCreds.status_emoji, '⚡');
  const statusMessage = safeStr(
    safeCreds.status_message,
    'Charging: Focused on MVP',
  );
  const bio = safeStr(
    safeCreds.bio,
    '"Building the Human OS. Prioritizing authenticity over engagement metrics."',
  );

  return (
    <Box
      sx={{
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        pt: 12,
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
            <Box sx={{ position: 'relative' }}>
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
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  border: '1px solid rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'primary.main' },
                }}
              >
                <PlayCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
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

            <Stack spacing={2}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setIsEditOpen(true);
                }}
                disabled={loading}
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

        {/* 2. THE CAROUSEL */}
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, pl: 2 }}>
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
          {/* A. The "Dormant Reactor" Add Card (Red) */}
          <Paper
            onClick={(e) => {
              e.currentTarget.blur();
              setIsAddProjectOpen(true);
            }}
            sx={{
              minWidth: 320,
              height: 400,
              borderRadius: 3,
              scrollSnapAlign: 'start',
              ...CANDY_HAZARD,
            }}
          >
            <AddCircleOutlineIcon
              sx={{
                fontSize: 60,
                mb: 2,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            />
            <Typography variant="h6" fontWeight={800} letterSpacing={1}>
              ADD PROJECT
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, mt: 1 }}>
              INITIALIZE
            </Typography>
          </Paper>

          {/* B. The Resume Card (Red if Empty, Green if Full) */}
          <Paper
            sx={
              !profile?.resume_url
                ? {
                    minWidth: 320,
                    height: 400,
                    borderRadius: 3,
                    scrollSnapAlign: 'start',
                    ...CANDY_HAZARD,
                  }
                : {
                    minWidth: 320,
                    height: 400,
                    borderRadius: 3,
                    scrollSnapAlign: 'start',
                    ...CANDY_SUCCESS,
                  }
            }
          >
            {profile?.resume_url ? (
              // SUCCESS STATE (Green)
              <>
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
              </>
            ) : (
              // UPLOAD STATE (Red)
              <>
                <UploadFileIcon
                  sx={{
                    fontSize: 60,
                    mb: 2,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  }}
                />
                <Typography variant="h6" fontWeight={800} letterSpacing={1}>
                  UPLOAD RESUME
                </Typography>
              </>
            )}

            <Button
              component="label"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                zIndex: 1,
                cursor: 'pointer',
              }}
            >
              <input
                type="file"
                hidden
                accept=".pdf"
                onChange={(e) => {
                  if (e.target.files?.[0] && uploadResume) {
                    uploadResume(e.target.files[0]);
                  }
                }}
              />
            </Button>
          </Paper>

          {/* C. The Project Loop (BLUEY MODE) */}
          {(projects as PortfolioItem[]).map((project: PortfolioItem) => (
            <Paper
              key={project.id}
              sx={{
                minWidth: 320,
                maxWidth: 320,
                height: 400,
                borderRadius: 3,
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column', // Content flows down
                // APPLY BLUEY STYLE
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
                      // Custom chip style to match the Bluey theme
                      sx={{
                        fontSize: '0.7rem',
                        height: 24,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'inherit',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                  ))}
                  {(project.tech_stack || []).length > 3 && (
                    <Chip
                      label={`+${(project.tech_stack || []).length - 3}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.7rem',
                        height: 24,
                        color: 'inherit',
                        borderColor: 'currentColor',
                      }}
                    />
                  )}
                </Stack>

                {project.project_url && (
                  <Button
                    href={project.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
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

      {profile && (
        <EditProfileDialog
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          profile={profile}
          onUpdate={updateProfile}
          onUpload={uploadAvatar}
        />
      )}

      <AddProjectDialog
        open={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSubmit={addProject}
      />
    </Box>
  );
};

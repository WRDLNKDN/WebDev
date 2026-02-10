import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

// MODULAR COMPONENTS
import { AddProjectCard } from '../components/portfolio/AddProjectCard';
import { AddProjectDialog } from '../components/portfolio/AddProjectDialog';
import { PortfolioFrame } from '../components/portfolio/PortfolioFrame';
import { ProjectCard } from '../components/portfolio/ProjectCard';
import { ResumeCard } from '../components/portfolio/ResumeCard';
import { EditProfileDialog } from '../components/profile/EditProfileDialog';
import { IdentityHeader } from '../components/profile/IdentityHeader';
import { SettingsDialog } from '../components/profile/SettingsDialog';

// --- NEW WIDGET SECTORS ---
import { EditLinksDialog } from '../components/profile/EditLinksDialog';
import { ProfileLinksWidget } from '../components/profile/ProfileLinksWidget';

// LOGIC & TYPES
import { useProfile } from '../hooks/useProfile';
import { getMyWeirdling } from '../lib/weirdlingApi';
import { supabase } from '../lib/supabaseClient';
import { GLASS_CARD } from '../theme/candyStyles';
import type { Weirdling } from '../types/weirdling';
import type { NerdCreds } from '../types/profile';
import { safeStr } from '../utils/stringUtils';

// ASSETS
const SYNERGY_BG = 'url("/assets/profile-bg.png")';

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // WIRED UP: This controls the new Link Manager Modal
  const [isLinksOpen, setIsLinksOpen] = useState(false);

  // My Weirdling (saved persona from Create My Weirdling)
  const [weirdling, setWeirdling] = useState<Weirdling | null | undefined>(
    undefined,
  );

  // AUTH GUARD
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/');
      } else {
        setSession(data.session);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    getMyWeirdling()
      .then(setWeirdling)
      .catch(() => setWeirdling(null));
  }, [session]);

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

  // DATA INGESTION
  const rawName = profile?.display_name || session.user.user_metadata.full_name;
  const displayName = safeStr(rawName, 'Verified Generalist');
  const tagline = safeStr(
    profile?.tagline,
    'Full Stack Developer | System Architect',
  );
  const avatarUrl = safeStr(
    profile?.avatar || session.user.user_metadata.avatar_url,
  );

  // TYPE-SAFE NERD CREDS
  const safeNerdCreds =
    profile?.nerd_creds && typeof profile.nerd_creds === 'object'
      ? (profile.nerd_creds as unknown as NerdCreds)
      : ({} as NerdCreds);

  const statusEmoji = safeStr(safeNerdCreds.status_emoji, '⚡');
  const statusMessage = safeStr(
    safeNerdCreds.status_message,
    'Charging: Focused on MVP',
  );
  const bio = safeStr(
    safeNerdCreds.bio,
    '"Building the Human OS. Prioritizing authenticity over engagement metrics."',
  );

  return (
    <Box
      sx={{
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        pt: 4,
        pb: 8,
        minHeight: '100vh',
      }}
    >
      <Container maxWidth="lg">
        {/* 1. IDENTITY SECTOR */}
        <IdentityHeader
          displayName={displayName}
          tagline={tagline}
          bio={bio}
          avatarUrl={avatarUrl}
          statusEmoji={statusEmoji}
          statusMessage={statusMessage}
          actions={
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditOpen(true)}
                disabled={loading}
                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
              >
                Edit Profile
              </Button>
              <Button
                variant="text"
                startIcon={<SettingsIcon />}
                onClick={() => setIsSettingsOpen(true)}
                sx={{ color: 'text.secondary' }}
              >
                Settings
              </Button>
            </>
          }
        />

        {/* 2. THE GRID LAYOUT */}
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* LEFT COLUMN: The "Links Widget" Editor */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                ...GLASS_CARD,
                p: 3,
                mb: 4,
                position: { md: 'sticky' },
                top: { md: 24 },
              }}
            >
              {/* Editor Action: Manage Links */}
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Box sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  LINKS
                </Box>
                <Button
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={() => setIsLinksOpen(true)}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Manage
                </Button>
              </Stack>

              {/* The Display Widget (Preview) */}
              <ProfileLinksWidget socials={profile?.socials || []} />

              {/* ESCAPED QUOTES FIX */}
              {(!profile?.socials || profile.socials.length === 0) && (
                <Box
                  sx={{
                    color: 'text.disabled',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    mt: 1,
                  }}
                >
                  No links visible. Click &apos;Manage&apos; to add.
                </Box>
              )}
            </Paper>

            {/* My Weirdling (saved persona) */}
            <Paper
              elevation={0}
              sx={{
                ...GLASS_CARD,
                p: 3,
                mb: 4,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Box sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  MY WEIRDLING
                </Box>
                <Button
                  component={RouterLink}
                  to="/weirdling/create"
                  size="small"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {weirdling ? 'Edit' : 'Create'}
                </Button>
              </Stack>
              {weirdling === undefined && (
                <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {weirdling === null && (
                <Typography variant="body2" color="text.secondary">
                  Create a personalized Weirdling persona (name, vibe, tagline)
                  and save it here.
                </Typography>
              )}
              {weirdling && (
                <Box>
                  {weirdling.avatarUrl && (
                    <Box
                      component="img"
                      src={weirdling.avatarUrl}
                      alt={`${weirdling.displayName} Weirdling`}
                      sx={{
                        width: '100%',
                        maxWidth: 120,
                        height: 'auto',
                        borderRadius: 2,
                        mb: 2,
                        display: 'block',
                      }}
                    />
                  )}
                  <Typography variant="subtitle1" fontWeight={600}>
                    {weirdling.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{weirdling.handle} · {weirdling.roleVibe}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {weirdling.tagline}
                  </Typography>
                  {weirdling.bio && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {weirdling.bio}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* RIGHT COLUMN: The "Portfolio" Sector */}
          <Grid size={{ xs: 12, md: 8 }}>
            <PortfolioFrame title="Portfolio Frame">
              <AddProjectCard onClick={() => setIsAddProjectOpen(true)} />

              <ResumeCard
                url={profile?.resume_url}
                onUpload={uploadResume}
                isOwner
              />

              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </PortfolioFrame>
          </Grid>
        </Grid>
      </Container>

      {/* OVERLAY DIALOGS — Settings always mounted so button works; Edit/Links need profile */}
      {profile && (
        <>
          <EditProfileDialog
            open={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            profile={profile}
            onUpdate={updateProfile}
            onUpload={uploadAvatar}
          />
          <EditLinksDialog
            open={isLinksOpen}
            onClose={() => setIsLinksOpen(false)}
            currentLinks={profile.socials || []}
            onUpdate={updateProfile}
          />
        </>
      )}

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onEditProfile={() => {
          setIsSettingsOpen(false);
          setIsEditOpen(true);
        }}
        onManageLinks={() => {
          setIsSettingsOpen(false);
          setIsLinksOpen(true);
        }}
      />

      <AddProjectDialog
        open={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSubmit={addProject}
      />
    </Box>
  );
};

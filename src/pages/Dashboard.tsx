import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// MODULAR COMPONENTS
import { AddProjectDialog } from '../components/portfolio/AddProjectDialog';
import { CompactAddCard } from '../components/portfolio/CompactAddCard';
import { ProjectCard } from '../components/portfolio/ProjectCard';
import { ResumeCard } from '../components/portfolio/ResumeCard';
import { EditProfileDialog } from '../components/profile/EditProfileDialog';
import {
  IdentityBadges,
  IdentityHeader,
} from '../components/profile/IdentityHeader';
import { SettingsDialog } from '../components/profile/SettingsDialog';
import { EditLinksDialog } from '../components/profile/EditLinksDialog';
import { ProfileLinksWidget } from '../components/profile/ProfileLinksWidget';
import { WeirdlingCarousel } from '../components/profile/WeirdlingCarousel';
import { WeirdlingCreateDialog } from '../components/profile/WeirdlingCreateDialog';

// LOGIC & TYPES
import { useProfile } from '../hooks/useProfile';
import { toMessage } from '../lib/errors';
import { deleteWeirdling, getMyWeirdlings } from '../lib/weirdlingApi';
import { supabase } from '../lib/supabaseClient';
import { GLASS_CARD } from '../theme/candyStyles';
import type { Weirdling } from '../types/weirdling';
import type { NerdCreds } from '../types/profile';
import { safeStr } from '../utils/stringUtils';

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLinksOpen, setIsLinksOpen] = useState(false);
  const [isAddWeirdlingOpen, setIsAddWeirdlingOpen] = useState(false);

  const [weirdlings, setWeirdlings] = useState<Weirdling[] | null | undefined>(
    undefined,
  );

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
    getMyWeirdlings()
      .then(setWeirdlings)
      .catch(() => setWeirdlings([]));
  }, [session]);

  const {
    profile,
    projects,
    loading,
    refresh,
    updateProfile,
    uploadAvatar,
    addProject,
    deleteProject,
    uploadResume,
  } = useProfile();

  const [snack, setSnack] = useState<string | null>(null);

  if (!session) return null;

  const rawName =
    profile?.display_name || session.user.user_metadata?.full_name;
  const displayName = safeStr(rawName, 'Verified Generalist');
  const profileUseWeirdlingAvatar = Boolean(
    (profile as { use_weirdling_avatar?: boolean } | null)
      ?.use_weirdling_avatar,
  );
  const firstWeirdling = weirdlings?.[0];
  const avatarUrl = safeStr(
    profileUseWeirdlingAvatar && firstWeirdling?.avatarUrl
      ? firstWeirdling.avatarUrl
      : profile?.avatar || session.user.user_metadata?.avatar_url,
  );

  const safeNerdCreds =
    profile?.nerd_creds && typeof profile.nerd_creds === 'object'
      ? (profile.nerd_creds as unknown as NerdCreds)
      : ({} as NerdCreds);

  const bio = safeStr(
    safeNerdCreds.bio,
    '"Building the Human OS. Prioritizing authenticity over engagement metrics."',
  );

  const handleResumeUpload = (file: File) =>
    uploadResume(file)
      .then(() => refresh())
      .catch((e) => setSnack(toMessage(e)));

  return (
    <Box
      sx={{
        flex: 1,
        pt: 4,
        pb: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* 1. PROFILE IDENTITY BANNER */}
        <IdentityHeader
          displayName={displayName}
          tagline={profile?.tagline ?? undefined}
          bio={bio}
          avatarUrl={avatarUrl}
          slotUnderAvatarLabel={
            (profile?.socials ?? []).some((s) => s.isVisible)
              ? 'Links'
              : undefined
          }
          slotUnderAvatar={
            <ProfileLinksWidget
              socials={profile?.socials ?? []}
              isOwner
              onRemove={(linkId) => {
                const next = (profile?.socials ?? []).filter(
                  (s) => s.id !== linkId,
                );
                updateProfile({ socials: next })
                  .then(() => refresh())
                  .catch((e) => setSnack(toMessage(e)));
              }}
            />
          }
          badges={
            <IdentityBadges
              onTagsClick={() => setIsEditOpen(true)}
              onSkillsClick={() => setIsEditOpen(true)}
            />
          }
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
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setIsSettingsOpen(true)}
                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
              >
                Settings
              </Button>
            </>
          }
        />

        {/* WEIRDLINGS SECTION (showcase + add) */}
        <WeirdlingCarousel
          weirdlings={weirdlings ?? []}
          onAddClick={() => setIsAddWeirdlingOpen(true)}
          onRemove={(id) =>
            deleteWeirdling(id)
              .then(() => getMyWeirdlings().then(setWeirdlings))
              .catch((e) => setSnack(toMessage(e)))
          }
        />

        {/* 2. PORTFOLIO */}
        <Paper
          elevation={0}
          sx={{
            ...GLASS_CARD,
            p: 3,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              mb: 2,
              letterSpacing: 2,
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            PORTFOLIO
          </Typography>

          <Stack
            direction="row"
            spacing={3}
            sx={{ mb: 4 }}
            flexWrap="wrap"
            useFlexGap
          >
            <Box sx={{ flex: '1 1 160px', minWidth: 160, maxWidth: 280 }}>
              <CompactAddCard
                variant="neutral"
                label="Add Resume"
                accept=".pdf,.doc,.docx"
                onFileSelect={handleResumeUpload}
              />
            </Box>
            <Box sx={{ flex: '1 1 160px', minWidth: 160, maxWidth: 280 }}>
              <CompactAddCard
                variant="neutral"
                label="Add Project"
                onClick={() => setIsAddProjectOpen(true)}
              />
            </Box>
            <Box sx={{ flex: '1 1 160px', minWidth: 160, maxWidth: 280 }}>
              <CompactAddCard
                variant="neutral"
                label="Skills"
                onClick={() => setIsEditOpen(true)}
              />
            </Box>
            <Box sx={{ flex: '1 1 160px', minWidth: 160, maxWidth: 280 }}>
              <CompactAddCard
                variant="neutral"
                label="Links"
                onClick={() => setIsLinksOpen(true)}
              />
            </Box>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 4 }} />

          <Grid container spacing={4}>
            {profile?.resume_url && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <ResumeCard
                  url={profile.resume_url}
                  onUpload={handleResumeUpload}
                  isOwner
                />
              </Grid>
            )}
            {projects.map((project) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
                <ProjectCard
                  project={project}
                  isOwner
                  onDelete={(id) =>
                    deleteProject(id).catch((e) => setSnack(toMessage(e)))
                  }
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      <WeirdlingCreateDialog
        open={isAddWeirdlingOpen}
        onClose={() => setIsAddWeirdlingOpen(false)}
        onSuccess={() =>
          getMyWeirdlings()
            .then(setWeirdlings)
            .catch(() => setWeirdlings([]))
        }
      />
      <EditProfileDialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profile={profile}
        hasWeirdling={Boolean(weirdlings?.length)}
        onUpdate={updateProfile}
        onUpload={uploadAvatar}
      />
      <EditLinksDialog
        open={isLinksOpen}
        onClose={() => setIsLinksOpen(false)}
        currentLinks={profile?.socials ?? []}
        onUpdate={async (updates) => {
          await updateProfile(updates);
          await refresh();
        }}
      />

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

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Box,
  Button,
  Container,
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
import { ProjectCard } from '../components/portfolio/ProjectCard';
import { ResumeCard } from '../components/portfolio/ResumeCard';
import { EditProfileDialog } from '../components/profile/EditProfileDialog';
import { EmailPreferencesDialog } from '../components/profile/EmailPreferencesDialog';
import {
  IdentityBadges,
  IdentityHeader,
} from '../components/profile/IdentityHeader';
import { SettingsDialog } from '../components/profile/SettingsDialog';
import { EditLinksDialog } from '../components/profile/EditLinksDialog';
import { ProfileLinksWidget } from '../components/profile/ProfileLinksWidget';
import { WeirdlingBannerSlot } from '../components/profile/WeirdlingBannerSlot';
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
  const [isEmailPrefsOpen, setIsEmailPrefsOpen] = useState(false);
  const [isAddWeirdlingOpen, setIsAddWeirdlingOpen] = useState(false);
  const [weirdlings, setWeirdlings] = useState<Weirdling[] | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/');
      } else {
        setSession(data.session);
      }
    };
    void init();
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        const list = await getMyWeirdlings();
        setWeirdlings(list);
      } catch {
        setWeirdlings([]);
      }
    };
    void load();
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
  const avatarUrl = safeStr(
    profile?.avatar || session.user.user_metadata?.avatar_url,
  );

  const safeNerdCreds =
    profile?.nerd_creds && typeof profile.nerd_creds === 'object'
      ? (profile.nerd_creds as unknown as NerdCreds)
      : ({} as NerdCreds);

  const bio = safeStr(
    safeNerdCreds.bio,
    '"Building the Human OS. Prioritizing authenticity over engagement metrics."',
  );

  const handleResumeUpload = async (file: File) => {
    try {
      await uploadResume(file);
      await refresh();
    } catch (e) {
      setSnack(toMessage(e));
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        pt: { xs: 2, md: 4 },
        pb: { xs: 'calc(32px + env(safe-area-inset-bottom))', md: 8 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <IdentityHeader
          displayName={displayName}
          tagline={profile?.tagline ?? undefined}
          bio={bio}
          avatarUrl={avatarUrl}
          slotUnderAvatarLabel={undefined}
          slotUnderAvatar={
            <ProfileLinksWidget
              socials={profile?.socials ?? []}
              isOwner
              onRemove={async (linkId) => {
                const next = (profile?.socials ?? []).filter(
                  (s) => s.id !== linkId,
                );
                try {
                  await updateProfile({ socials: next });
                  await refresh();
                } catch (e) {
                  setSnack(toMessage(e));
                }
              }}
            />
          }
          badges={
            <IdentityBadges
              onTagsClick={() => setIsEditOpen(true)}
              onSkillsClick={() => setIsEditOpen(true)}
            />
          }
          slotBetweenContentAndActions={
            weirdlings && weirdlings.length > 0 ? (
              <WeirdlingBannerSlot
                weirdlings={weirdlings}
                onAddClick={() => setIsAddWeirdlingOpen(true)}
                onRemove={async (id: string) => {
                  try {
                    await deleteWeirdling(id);
                    const list = await getMyWeirdlings();
                    setWeirdlings(list);
                  } catch (e) {
                    setSnack(toMessage(e));
                  }
                }}
              />
            ) : undefined
          }
          actions={
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditOpen(true)}
                disabled={loading}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                }}
              >
                Edit Profile
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setIsSettingsOpen(true)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                }}
              >
                Settings
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIsAddWeirdlingOpen(true)}
                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
              >
                Add weirdling
              </Button>
            </>
          }
        />

        {/* PORTFOLIO: Action buttons + content cards */}
        <Paper
          elevation={0}
          sx={{
            ...GLASS_CARD,
            p: { xs: 2, md: 3 },
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

          {/* Action buttons: responsive grid on mobile */}
          <Stack
            direction="row"
            flexWrap="wrap"
            useFlexGap
            spacing={2}
            sx={{ mb: 4 }}
          >
            <Box
              component="label"
              sx={{
                flex: { xs: '1 1 45%', md: 1 },
                minWidth: { xs: 120, md: 0 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
                bgcolor: 'rgba(45, 45, 50, 0.95)',
                color: 'white',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(60, 60, 65, 0.95)',
                  borderColor: 'rgba(255,255,255,0.25)',
                },
              }}
            >
              <AddIcon sx={{ fontSize: 36, mb: 1 }} />
              <Typography variant="subtitle2" fontWeight={600}>
                Add Resume
              </Typography>
              <input
                type="file"
                hidden
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleResumeUpload(f);
                }}
              />
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setIsAddProjectOpen(true)}
              sx={{
                flex: { xs: '1 1 45%', md: 1 },
                minWidth: { xs: 120, md: 0 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
                bgcolor: 'rgba(45, 45, 50, 0.95)',
                color: 'white',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                '&:hover': {
                  bgcolor: 'rgba(60, 60, 65, 0.95)',
                  borderColor: 'rgba(255,255,255,0.25)',
                },
              }}
            >
              <AddIcon sx={{ fontSize: 36, mb: 1 }} />
              <Typography variant="subtitle2" fontWeight={600}>
                Add Project
              </Typography>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setIsEditOpen(true)}
              sx={{
                flex: { xs: '1 1 45%', md: 1 },
                minWidth: { xs: 120, md: 0 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
                bgcolor: 'rgba(45, 45, 50, 0.95)',
                color: 'white',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                '&:hover': {
                  bgcolor: 'rgba(60, 60, 65, 0.95)',
                  borderColor: 'rgba(255,255,255,0.25)',
                },
              }}
            >
              <AddIcon sx={{ fontSize: 36, mb: 1 }} />
              <Typography variant="subtitle2" fontWeight={600}>
                Skills
              </Typography>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setIsLinksOpen(true)}
              sx={{
                flex: { xs: '1 1 45%', md: 1 },
                minWidth: { xs: 120, md: 0 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
                bgcolor: 'rgba(45, 45, 50, 0.95)',
                color: 'white',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                '&:hover': {
                  bgcolor: 'rgba(60, 60, 65, 0.95)',
                  borderColor: 'rgba(255,255,255,0.25)',
                },
              }}
            >
              <AddIcon sx={{ fontSize: 36, mb: 1 }} />
              <Typography variant="subtitle2" fontWeight={600}>
                Links
              </Typography>
            </Box>
          </Stack>

          {/* Content cards: Resume + Projects */}
          <Grid container spacing={{ xs: 2, md: 4 }}>
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
                  onDelete={async (id) => {
                    try {
                      await deleteProject(id);
                    } catch (e) {
                      setSnack(toMessage(e));
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      <WeirdlingCreateDialog
        open={isAddWeirdlingOpen}
        onClose={() => setIsAddWeirdlingOpen(false)}
        onSuccess={async () => {
          try {
            const list = await getMyWeirdlings();
            setWeirdlings(list);
          } catch {
            setWeirdlings([]);
          }
        }}
      />
      <EditProfileDialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profile={profile}
        hasWeirdling={Boolean(weirdlings?.length)}
        avatarFallback={
          session?.user?.user_metadata?.avatar_url as string | undefined
        }
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
        onEmailPreferences={() => {
          setIsSettingsOpen(false);
          setIsEmailPrefsOpen(true);
        }}
      />

      <EmailPreferencesDialog
        open={isEmailPrefsOpen}
        onClose={() => setIsEmailPrefsOpen(false)}
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
        sx={{ mb: { xs: 'env(safe-area-inset-bottom)', md: 0 } }}
      />
    </Box>
  );
};

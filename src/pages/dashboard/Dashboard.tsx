import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Container,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// MODULAR COMPONENTS
import { AddProjectDialog } from '../../components/portfolio/AddProjectDialog';
import { ProjectCard } from '../../components/portfolio/ProjectCard';
import { ResumeCard } from '../../components/portfolio/ResumeCard';
import { EditProfileDialog } from '../../components/profile/EditProfileDialog';
import { IdentityHeader } from '../../components/profile/IdentityHeader';
import { EditLinksDialog } from '../../components/profile/EditLinksDialog';
import { ProfileLinksWidget } from '../../components/profile/ProfileLinksWidget';

// LOGIC & TYPES
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useProfile } from '../../hooks/useProfile';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { GLASS_CARD } from '../../theme/candyStyles';
import type { NerdCreds } from '../../types/profile';
import { safeStr } from '../../utils/stringUtils';

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { openEditDialog?: boolean } | undefined;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isLinksOpen, setIsLinksOpen] = useState(false);

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

  // Open Edit Profile when navigated from own profile with state
  useEffect(() => {
    if (state?.openEditDialog) {
      setIsEditOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [state?.openEditDialog, navigate, location.pathname]);

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
    retryResumeThumbnail,
    updating,
  } = useProfile();

  const { avatarUrl: ctxAvatarUrl, refresh: refreshAvatar } =
    useCurrentUserAvatar();

  const [snack, setSnack] = useState<string | null>(null);

  if (!session) return null;

  const rawName =
    profile?.display_name || session.user.user_metadata?.full_name;
  const displayName = safeStr(rawName, 'Verified Generalist');
  const resolvedAvatarUrl =
    profile?.avatar || session.user.user_metadata?.avatar_url;
  const avatarUrl = ctxAvatarUrl ?? safeStr(resolvedAvatarUrl);

  const safeNerdCreds =
    profile?.nerd_creds && typeof profile.nerd_creds === 'object'
      ? (profile.nerd_creds as unknown as NerdCreds)
      : ({} as NerdCreds);
  const resumeThumbnailUrl =
    typeof safeNerdCreds.resume_thumbnail_url === 'string'
      ? safeNerdCreds.resume_thumbnail_url
      : null;
  const resumeThumbnailStatus =
    safeNerdCreds.resume_thumbnail_status === 'pending' ||
    safeNerdCreds.resume_thumbnail_status === 'complete' ||
    safeNerdCreds.resume_thumbnail_status === 'failed'
      ? safeNerdCreds.resume_thumbnail_status
      : null;

  // Description: Join wizard About (additional_context) first, then Edit Profile bio
  const descriptionFromJoin = safeStr(profile?.additional_context).trim();
  const descriptionFromBio = safeStr(safeNerdCreds.bio).trim();
  const hasDescription = Boolean(descriptionFromJoin || descriptionFromBio);
  const bio = hasDescription
    ? descriptionFromJoin || descriptionFromBio
    : 'Add a short About to your profile.';
  const bioIsPlaceholder = !hasDescription;
  const selectedSkills =
    Array.isArray(safeNerdCreds.skills) &&
    safeNerdCreds.skills.every((skill) => typeof skill === 'string')
      ? (safeNerdCreds.skills as string[])
          .map((skill) => skill.trim())
          .filter(Boolean)
      : typeof safeNerdCreds.skills === 'string'
        ? safeNerdCreds.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [];
  const selectedIndustries = safeStr(profile?.industry)
    .split(',')
    .map((industry) => industry.trim())
    .filter(Boolean);
  const hasVisibleSocialLinks = (profile?.socials ?? []).some(
    (link) => link.isVisible,
  );
  const orderedProjectIds =
    Array.isArray(safeNerdCreds.project_order) &&
    safeNerdCreds.project_order.every((id) => typeof id === 'string')
      ? (safeNerdCreds.project_order as string[])
      : [];
  const projectLookup = new Map(
    projects.map((project) => [project.id, project]),
  );
  const orderedProjects = [
    ...orderedProjectIds
      .map((id) => projectLookup.get(id))
      .filter((project): project is (typeof projects)[number] =>
        Boolean(project),
      ),
    ...projects.filter((project) => !orderedProjectIds.includes(project.id)),
  ];

  const persistProjectOrder = async (projectIds: string[]) => {
    await updateProfile({
      nerd_creds: {
        project_order: projectIds,
      } as Partial<NerdCreds>,
    });
    await refresh();
  };

  const moveProject = async (projectId: string, direction: 'up' | 'down') => {
    const index = orderedProjects.findIndex(
      (project) => project.id === projectId,
    );
    if (index < 0) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= orderedProjects.length) return;
    const next = [...orderedProjects];
    const [moving] = next.splice(index, 1);
    next.splice(swapIndex, 0, moving);
    try {
      await persistProjectOrder(next.map((project) => project.id));
    } catch (e) {
      setSnack(toMessage(e));
    }
  };

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
          bioIsPlaceholder={bioIsPlaceholder}
          avatarUrl={avatarUrl}
          slotLeftOfAvatar={
            hasVisibleSocialLinks ? (
              <ProfileLinksWidget
                socials={profile?.socials ?? []}
                grouped
                isOwner
                onRemove={async (linkId) => {
                  const next = (profile?.socials ?? []).filter(
                    (link) => link.id !== linkId,
                  );
                  try {
                    await updateProfile({ socials: next });
                    await refresh();
                  } catch (e) {
                    setSnack(toMessage(e));
                  }
                }}
              />
            ) : undefined
          }
          slotUnderAvatarLabel={undefined}
          slotUnderAvatar={null}
          badges={
            selectedSkills.length > 0 || selectedIndustries.length > 0 ? (
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                {selectedSkills.length > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      fontWeight: 700,
                    }}
                  >
                    Skills
                  </Typography>
                )}
                {selectedSkills.length > 0 && (
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {selectedSkills.map((skill) => (
                      <Box
                        key={`skill-${skill}`}
                        sx={{
                          display: 'inline-flex',
                          width: 'fit-content',
                          maxWidth: '100%',
                          whiteSpace: 'nowrap',
                          px: 1.25,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: 'rgba(236,64,122,0.15)',
                          border: '1px solid rgba(236,64,122,0.35)',
                          fontSize: '0.78rem',
                        }}
                      >
                        {skill}
                      </Box>
                    ))}
                  </Stack>
                )}
                {selectedIndustries.length > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      fontWeight: 700,
                    }}
                  >
                    Industries
                  </Typography>
                )}
                {selectedIndustries.length > 0 && (
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {selectedIndustries.map((industry) => (
                      <Box
                        key={`industry-${industry}`}
                        sx={{
                          display: 'inline-flex',
                          width: 'fit-content',
                          maxWidth: '100%',
                          whiteSpace: 'nowrap',
                          px: 1.25,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: 'rgba(66,165,245,0.15)',
                          border: '1px solid rgba(66,165,245,0.35)',
                          fontSize: '0.78rem',
                        }}
                      >
                        {industry}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            ) : undefined
          }
          slotBetweenContentAndActions={undefined}
          actions={
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              flexWrap="wrap"
              spacing={1}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <Button
                variant="contained"
                onClick={() => navigate('/feed')}
                size="small"
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  minHeight: { xs: 36, sm: 32 },
                  fontSize: '0.8rem',
                  px: 1.5,
                }}
              >
                Back to Feed
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditOpen(true)}
                disabled={loading}
                size="small"
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  width: { xs: '100%', sm: 'auto' },
                  minHeight: { xs: 36, sm: 32 },
                  fontSize: '0.8rem',
                  px: 1.5,
                }}
              >
                Edit Profile
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIsLinksOpen(true)}
                size="small"
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  width: { xs: '100%', sm: 'auto' },
                  minHeight: { xs: 36, sm: 32 },
                  fontSize: '0.8rem',
                  px: 1.5,
                }}
              >
                Add or Edit Links
              </Button>
              {profile?.handle && (
                <Button
                  variant="outlined"
                  component="a"
                  href={`/profile/${profile.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<OpenInNewIcon />}
                  size="small"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    width: { xs: '100%', sm: 'auto' },
                    minHeight: { xs: 36, sm: 32 },
                    fontSize: '0.8rem',
                    px: 1.5,
                  }}
                >
                  View Profile
                </Button>
              )}
            </Stack>
          }
        />

        {/* PORTFOLIO: Resume + Projects */}
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

          {/* Action buttons: compact, inline */}
          <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
            <Button
              component="label"
              variant="outlined"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 20 }} />}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 36,
              }}
            >
              Resume
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleResumeUpload(f);
                }}
              />
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 20 }} />}
              onClick={() => setIsAddProjectOpen(true)}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 36,
              }}
            >
              Add Project
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              justifyItems: { xs: 'stretch', sm: 'center' },
              alignItems: 'start',
            }}
          >
            {profile?.resume_url && (
              <ResumeCard
                url={profile?.resume_url}
                thumbnailUrl={resumeThumbnailUrl}
                thumbnailStatus={resumeThumbnailStatus}
                onUpload={handleResumeUpload}
                onRetryThumbnail={() => {
                  void retryResumeThumbnail().catch((e) => {
                    setSnack(toMessage(e));
                  });
                }}
                retryThumbnailBusy={updating}
                isOwner
              />
            )}

            {orderedProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                isOwner
                canMoveUp={index > 0}
                canMoveDown={index < orderedProjects.length - 1}
                onMoveUp={(id) => {
                  void moveProject(id, 'up');
                }}
                onMoveDown={(id) => {
                  void moveProject(id, 'down');
                }}
                onDelete={async (id) => {
                  try {
                    await deleteProject(id);
                    const next = orderedProjects
                      .filter((projectItem) => projectItem.id !== id)
                      .map((projectItem) => projectItem.id);
                    await persistProjectOrder(next);
                  } catch (e) {
                    setSnack(toMessage(e));
                  }
                }}
              />
            ))}
          </Box>
        </Paper>
      </Container>

      <EditProfileDialog
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          void refresh();
          void refreshAvatar();
        }}
        profile={profile}
        avatarFallback={
          session?.user?.user_metadata?.avatar_url as string | undefined
        }
        currentResolvedAvatarUrl={resolvedAvatarUrl ?? undefined}
        onUpdate={updateProfile}
        onUpload={uploadAvatar}
        onAvatarChanged={() => {
          void refresh();
          void refreshAvatar();
        }}
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

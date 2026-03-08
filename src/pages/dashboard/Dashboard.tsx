import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// MODULAR COMPONENTS
import { AddProjectDialog } from '../../components/portfolio/AddProjectDialog';
import { PortfolioPreviewModal } from '../../components/portfolio/PortfolioPreviewModal';
import { PortfolioSortableList } from '../../components/portfolio/PortfolioSortableList';
import { ResumeCard } from '../../components/portfolio/ResumeCard';
import { EditProfileDialog } from '../../components/profile/EditProfileDialog';
import { IdentityHeader } from '../../components/profile/IdentityHeader';
import { EditLinksDialog } from '../../components/profile/EditLinksDialog';
import { ProfileLinksWidget } from '../../components/profile/ProfileLinksWidget';
import { ShareProfileDialog } from '../../components/profile/ShareProfileDialog';

// LOGIC & TYPES
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useProfile } from '../../hooks/useProfile';
import { getIndustryDisplayLabels } from '../../lib/profile/industryGroups';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import { buildShareProfileUrl } from '../../lib/profile/shareProfileUrl';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { GLASS_CARD } from '../../theme/candyStyles';
import type { NerdCreds, SocialLink } from '../../types/profile';
import { RESUME_ITEM_ID, type PortfolioItem } from '../../types/portfolio';
import { safeStr } from '../../utils/stringUtils';

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { openEditDialog?: boolean } | undefined;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioItem | null>(
    null,
  );
  const [isLinksOpen, setIsLinksOpen] = useState(false);
  const [previewProject, setPreviewProject] = useState<PortfolioItem | null>(
    null,
  );
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareTokenError, setShareTokenError] = useState<string | null>(null);
  const [shareTokenLoading, setShareTokenLoading] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [editFocusBio, setEditFocusBio] = useState(false);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

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

  // Load or create profile share token for "Share my profile"
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setShareTokenError(null);
    const load = async () => {
      setShareTokenLoading(true);
      const { data, error } = await supabase.rpc(
        'get_or_create_profile_share_token',
      );
      if (cancelled) return;
      if (error) {
        setShareToken(null);
        const err = error as { code?: string; message?: string };
        const isRpcMissing =
          err.code === 'PGRST301' ||
          (typeof err.message === 'string' &&
            (err.message.includes('404') || err.message.includes('not found')));
        setShareTokenError(
          isRpcMissing
            ? "Share link isn't available right now. Please try again later."
            : toMessage(error),
        );
      } else {
        setShareToken(typeof data === 'string' ? data : null);
        setShareTokenError(null);
      }
      setShareTokenLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const {
    profile,
    projects,
    loading,
    refresh,
    updateProfile,
    uploadAvatar,
    addProject,
    updateProject,
    toggleProjectHighlight,
    deleteProject,
    reorderPortfolioItems,
    uploadResume,
    deleteResume,
    retryResumeThumbnail,
    updating,
  } = useProfile();

  const { avatarUrl: ctxAvatarUrl, refresh: refreshAvatar } =
    useCurrentUserAvatar();

  const [snack, setSnack] = useState<string | null>(null);
  /** After saving links in the dialog, show this so links appear immediately. */
  const [savedLinksOverride, setSavedLinksOverride] = useState<
    SocialLink[] | null
  >(null);
  /** Fallback so links still show if override/profile are briefly empty. */
  const lastLinksRef = useRef<SocialLink[]>([]);

  // Prime links from server on load so saved links show even before opening the dialog
  useEffect(() => {
    if (
      savedLinksOverride === null &&
      Array.isArray(profile?.socials) &&
      profile.socials.length > 0
    ) {
      setSavedLinksOverride(profile.socials);
    }
  }, [profile?.socials, savedLinksOverride]);
  // Keep ref in sync when profile has links so we have a fallback for display
  useEffect(() => {
    if (Array.isArray(profile?.socials) && profile.socials.length > 0) {
      lastLinksRef.current = profile.socials;
    }
  }, [profile?.socials]);

  // Coerce to array: prefer override, then profile, then last-known ref so links always show after save
  const socialsArray = useMemo(() => {
    const fromOverride = savedLinksOverride ?? [];
    const fromProfile = Array.isArray(profile?.socials) ? profile.socials : [];
    if (fromOverride.length > 0) return fromOverride;
    if (fromProfile.length > 0) return fromProfile;
    return lastLinksRef.current.length > 0 ? lastLinksRef.current : [];
  }, [savedLinksOverride, profile?.socials]);

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
  const resumeFileName =
    typeof safeNerdCreds.resume_file_name === 'string'
      ? safeNerdCreds.resume_file_name
      : null;
  const resumeThumbnailStatus =
    safeNerdCreds.resume_thumbnail_status === 'pending' ||
    safeNerdCreds.resume_thumbnail_status === 'complete' ||
    safeNerdCreds.resume_thumbnail_status === 'failed'
      ? safeNerdCreds.resume_thumbnail_status
      : null;

  // Bio: Join wizard About (additional_context) first, then Edit Profile bio
  const descriptionFromJoin = safeStr(profile?.additional_context).trim();
  const descriptionFromBio = safeStr(safeNerdCreds.bio).trim();
  const hasDescription = Boolean(descriptionFromJoin || descriptionFromBio);
  const bio = hasDescription ? descriptionFromJoin || descriptionFromBio : '';
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
  const selectedIndustries = getIndustryDisplayLabels(profile);
  const nicheField = (
    profile as unknown as { niche_field?: string }
  )?.niche_field?.trim();
  const handleResumeUpload = async (file: File) => {
    try {
      await uploadResume(file);
      await refresh();
    } catch (e) {
      setSnack(toMessage(e));
    }
  };
  const handleResumeInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleResumeUpload(file);
    }
    // Allow selecting the same file again.
    e.target.value = '';
  };
  const openResumePicker = () => {
    if (!resumeFileInputRef.current) return;
    resumeFileInputRef.current.value = '';
    resumeFileInputRef.current.click();
  };

  const openNewProjectDialog = () => {
    setEditingProject(null);
    setIsProjectDialogOpen(true);
  };

  const openEditProjectDialog = (project: PortfolioItem) => {
    setEditingProject(project);
    setIsProjectDialogOpen(true);
  };

  const closeProjectDialog = () => {
    setIsProjectDialogOpen(false);
    setEditingProject(null);
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
          onAddBio={
            bioIsPlaceholder
              ? () => {
                  setProfileMenuAnchor(null);
                  setEditFocusBio(true);
                  setIsEditOpen(true);
                }
              : undefined
          }
          avatarUrl={avatarUrl}
          slotLeftOfAvatar={
            hasVisibleSocialLinks(socialsArray) ? (
              <ProfileLinksWidget
                socials={socialsArray}
                isOwner
                onRemove={async (linkId) => {
                  const next = socialsArray.filter((l) => l.id !== linkId);
                  setSavedLinksOverride(next);
                  lastLinksRef.current = next;
                  try {
                    await updateProfile({ socials: next });
                    await refresh();
                  } catch (e) {
                    setSnack(toMessage(e));
                  }
                }}
                grouped
                collapsible
                defaultExpanded
              />
            ) : undefined
          }
          slotUnderAvatarLabel={undefined}
          slotUnderAvatar={null}
          badges={
            selectedSkills.length > 0 ||
            selectedIndustries.length > 0 ||
            !!nicheField ? (
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
                        data-testid="dashboard-pill"
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
                {(selectedIndustries.length > 0 || nicheField) && (
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
                {(selectedIndustries.length > 0 || nicheField) && (
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {selectedIndustries.map((industry) => (
                      <Box
                        key={`industry-${industry}`}
                        data-testid="dashboard-pill"
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
                    {nicheField && (
                      <Box
                        data-testid="dashboard-pill"
                        sx={{
                          display: 'inline-flex',
                          width: 'fit-content',
                          maxWidth: '100%',
                          whiteSpace: 'nowrap',
                          px: 1.25,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: 'rgba(66,165,245,0.1)',
                          border: '1px solid rgba(66,165,245,0.25)',
                          fontSize: '0.78rem',
                        }}
                      >
                        {nicheField}
                      </Box>
                    )}
                  </Stack>
                )}
              </Stack>
            ) : undefined
          }
          slotBetweenContentAndActions={undefined}
          actions={
            <>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
                  endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                  disabled={loading}
                  aria-label="Profile menu"
                  aria-haspopup="true"
                  aria-expanded={Boolean(profileMenuAnchor)}
                  sx={{
                    borderColor: 'rgba(45, 212, 191, 0.6)',
                    color: '#2dd4bf',
                    minHeight: 38,
                    fontSize: '0.875rem',
                    py: 0.6,
                    px: 1.5,
                    '&:hover': {
                      borderColor: '#2dd4bf',
                      bgcolor: 'rgba(45, 212, 191, 0.12)',
                    },
                  }}
                >
                  Profile
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/dashboard/settings')}
                  disabled={loading}
                  aria-label="Settings"
                  sx={{
                    borderColor: 'rgba(45, 212, 191, 0.6)',
                    color: '#2dd4bf',
                    minHeight: 38,
                    fontSize: '0.875rem',
                    py: 0.6,
                    px: 1.5,
                    '&:hover': {
                      borderColor: '#2dd4bf',
                      bgcolor: 'rgba(45, 212, 191, 0.12)',
                    },
                  }}
                >
                  Settings
                </Button>
              </Stack>
              <Menu
                anchorEl={profileMenuAnchor}
                open={Boolean(profileMenuAnchor)}
                onClose={() => setProfileMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1.5,
                      minWidth: 200,
                      borderRadius: 2,
                      bgcolor: 'rgba(30,30,30,0.98)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    },
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    setProfileMenuAnchor(null);
                    setIsLinksOpen(true);
                  }}
                  sx={{ py: 1.25 }}
                >
                  Add or Edit Links
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setProfileMenuAnchor(null);
                    setIsEditOpen(true);
                  }}
                  sx={{ py: 1.25 }}
                >
                  Edit Profile
                </MenuItem>
                {profile?.handle && (
                  <MenuItem
                    component="a"
                    href={`/p/h~${encodeURIComponent(profile.handle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setProfileMenuAnchor(null)}
                    sx={{ py: 1.25 }}
                  >
                    View Profile
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    setProfileMenuAnchor(null);
                    setIsShareDialogOpen(true);
                  }}
                  sx={{ py: 1.25 }}
                >
                  Share My Profile
                </MenuItem>
              </Menu>
            </>
          }
        />

        {/* PORTFOLIO: Resume + Projects — empty state or grid */}
        <Paper
          data-testid="portfolio-section"
          elevation={0}
          sx={{
            ...GLASS_CARD,
            p: { xs: 2, md: 3 },
            overflowX: 'hidden',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
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
            <input
              ref={resumeFileInputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeInputChange}
            />

            {!profile?.resume_url && projects.length === 0 ? (
              /* Empty state: one Add dropdown */
              <>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Your profile is empty.
                </Typography>
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ mb: 2, justifyContent: 'flex-start' }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                    endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                    onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                    disabled={loading}
                    aria-label="Add links, resume, or project"
                    aria-haspopup="true"
                    aria-expanded={Boolean(addMenuAnchor)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'white',
                      background:
                        'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)',
                      border: 'none',
                      minHeight: 34,
                      py: 0.5,
                      px: 1.5,
                      fontSize: '0.8125rem',
                      '&:hover': {
                        background:
                          'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)',
                      },
                    }}
                  >
                    Add
                  </Button>
                  <Menu
                    anchorEl={addMenuAnchor}
                    open={Boolean(addMenuAnchor)}
                    onClose={() => setAddMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 1.5,
                          minWidth: 200,
                          borderRadius: 2,
                          bgcolor: 'rgba(30,30,30,0.98)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        },
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        setAddMenuAnchor(null);
                        setIsLinksOpen(true);
                      }}
                      sx={{ py: 1.25 }}
                    >
                      + Add Links
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setAddMenuAnchor(null);
                        openResumePicker();
                      }}
                      sx={{ py: 1.25 }}
                    >
                      + Add Resume
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setAddMenuAnchor(null);
                        openNewProjectDialog();
                      }}
                      sx={{ py: 1.25 }}
                    >
                      + Add Project
                    </MenuItem>
                  </Menu>
                </Stack>
              </>
            ) : (
              <>
                {/* One Add button with dropdown in portfolio area */}
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ mb: 2, justifyContent: 'flex-start' }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                    endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                    onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                    disabled={loading}
                    aria-label="Add links, resume, or project"
                    aria-haspopup="true"
                    aria-expanded={Boolean(addMenuAnchor)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'white',
                      background:
                        'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)',
                      border: 'none',
                      minHeight: 34,
                      py: 0.5,
                      px: 1.5,
                      fontSize: '0.8125rem',
                      '&:hover': {
                        background:
                          'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)',
                      },
                    }}
                  >
                    Add
                  </Button>
                  <Menu
                    anchorEl={addMenuAnchor}
                    open={Boolean(addMenuAnchor)}
                    onClose={() => setAddMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 1.5,
                          minWidth: 200,
                          borderRadius: 2,
                          bgcolor: 'rgba(30,30,30,0.98)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        },
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        setAddMenuAnchor(null);
                        setIsLinksOpen(true);
                      }}
                      sx={{ py: 1.25 }}
                    >
                      + Add Links
                    </MenuItem>
                    {!profile?.resume_url && (
                      <MenuItem
                        onClick={() => {
                          setAddMenuAnchor(null);
                          openResumePicker();
                        }}
                        sx={{ py: 1.25 }}
                      >
                        + Add Resume
                      </MenuItem>
                    )}
                    <MenuItem
                      onClick={() => {
                        setAddMenuAnchor(null);
                        openNewProjectDialog();
                      }}
                      sx={{ py: 1.25 }}
                    >
                      + Add Project
                    </MenuItem>
                  </Menu>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gap: { xs: 1, sm: 1.25, md: 1.5 },
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(280px, 1fr))',
                      lg: 'repeat(4, minmax(240px, 1fr))',
                    },
                    justifyItems: 'stretch',
                    alignItems: 'start',
                  }}
                >
                  <PortfolioSortableList
                    orderedIds={(() => {
                      const projectIds = projects.map((p) => p.id);
                      if (!profile?.resume_url) return projectIds;
                      const resumeIndex = Math.min(
                        Math.max(0, safeNerdCreds.resume_display_index ?? 0),
                        projectIds.length,
                      );
                      return [
                        ...projectIds.slice(0, resumeIndex),
                        RESUME_ITEM_ID,
                        ...projectIds.slice(resumeIndex),
                      ];
                    })()}
                    projects={projects}
                    renderResumeCard={
                      profile?.resume_url
                        ? (dragHandle) => (
                            <ResumeCard
                              url={profile?.resume_url}
                              fileName={resumeFileName}
                              thumbnailUrl={resumeThumbnailUrl}
                              thumbnailStatus={resumeThumbnailStatus}
                              thumbnailError={
                                typeof safeNerdCreds.resume_thumbnail_error ===
                                'string'
                                  ? safeNerdCreds.resume_thumbnail_error
                                  : null
                              }
                              onUpload={handleResumeUpload}
                              onRetryThumbnail={() => {
                                void retryResumeThumbnail().catch((e) => {
                                  setSnack(toMessage(e));
                                });
                              }}
                              retryThumbnailBusy={updating}
                              onDelete={async () => {
                                try {
                                  await deleteResume();
                                  void refresh();
                                } catch (e) {
                                  setSnack(toMessage(e));
                                }
                              }}
                              deleteBusy={updating}
                              isOwner
                              dragHandle={dragHandle}
                            />
                          )
                        : undefined
                    }
                    isOwner
                    onReorder={async (orderedIds) => {
                      try {
                        await reorderPortfolioItems(orderedIds);
                      } catch (e) {
                        setSnack(toMessage(e));
                      }
                    }}
                    onDelete={async (id) => {
                      try {
                        await deleteProject(id);
                      } catch (e) {
                        setSnack(toMessage(e));
                      }
                    }}
                    onToggleHighlight={async (id, isHighlighted) => {
                      try {
                        await toggleProjectHighlight(id, isHighlighted);
                      } catch (e) {
                        setSnack(toMessage(e));
                      }
                    }}
                    onEdit={(project) => {
                      openEditProjectDialog(project);
                    }}
                    onOpenPreview={setPreviewProject}
                  />
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Container>

      <Dialog
        open={regenerateConfirmOpen}
        onClose={() => !regenerating && setRegenerateConfirmOpen(false)}
        aria-labelledby="regenerate-share-link-title"
        aria-describedby="regenerate-share-link-description"
      >
        <DialogTitle id="regenerate-share-link-title">
          Regenerate share link?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="regenerate-share-link-description">
            Regenerating will break previously shared links. Anyone with the old
            link will no longer be able to view your profile. You can share the
            new link afterward.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRegenerateConfirmOpen(false)}
            disabled={regenerating}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setRegenerating(true);
              try {
                const { data, error } = await supabase.rpc(
                  'regenerate_profile_share_token',
                );
                if (error) {
                  setSnack(toMessage(error));
                  return;
                }
                setShareToken(typeof data === 'string' ? data : null);
                setRegenerateConfirmOpen(false);
                setSnack('New link generated. Previous link no longer works.');
              } catch (e) {
                setSnack(toMessage(e));
              } finally {
                setRegenerating(false);
              }
            }}
            variant="contained"
            color="primary"
            disabled={regenerating}
          >
            {regenerating ? 'Regenerating…' : 'Regenerate link'}
          </Button>
        </DialogActions>
      </Dialog>

      <EditProfileDialog
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditFocusBio(false);
          void refresh();
          void refreshAvatar();
        }}
        profile={profile}
        focusBioOnOpen={editFocusBio}
        avatarFallback={
          session?.user?.user_metadata?.avatar_url as string | undefined
        }
        currentResolvedAvatarUrl={resolvedAvatarUrl ?? undefined}
        onUpdate={updateProfile}
        onUpload={uploadAvatar}
        onManageLinks={() => {
          setEditFocusBio(false);
          setIsEditOpen(false);
          setIsLinksOpen(true);
        }}
        onAvatarChanged={() => {
          void refresh();
          void refreshAvatar();
        }}
      />
      <EditLinksDialog
        open={isLinksOpen}
        onClose={() => setIsLinksOpen(false)}
        currentLinks={socialsArray}
        existingProjectUrls={projects.map((p) => p.project_url)}
        onUpdate={async (updates) => {
          if (Array.isArray(updates.socials)) {
            lastLinksRef.current = updates.socials;
            setSavedLinksOverride(updates.socials);
          }
          await updateProfile(updates);
          // Refetch after a short delay so profile.socials is in sync with DB
          await new Promise((r) => setTimeout(r, 350));
          await refresh();
        }}
      />
      <AddProjectDialog
        open={isProjectDialogOpen}
        onClose={closeProjectDialog}
        existingProjects={projects}
        existingLinkUrls={socialsArray.map((s) => s.url)}
        onSubmit={async (project, file, projectId) => {
          if (projectId) {
            await updateProject(projectId, project, file);
            return;
          }
          await addProject(project, file);
        }}
        initialProject={editingProject}
        projectId={editingProject?.id}
      />
      <PortfolioPreviewModal
        project={previewProject}
        open={Boolean(previewProject)}
        onClose={() => setPreviewProject(null)}
      />
      <ShareProfileDialog
        open={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        shareUrl={shareToken ? buildShareProfileUrl(shareToken) : null}
        shareTokenLoading={shareTokenLoading}
        shareTokenError={shareTokenError}
        onCopy={async () => {
          if (!shareToken) return;
          const url = buildShareProfileUrl(shareToken);
          try {
            await navigator.clipboard.writeText(url);
            setSnack('Link copied to clipboard.');
          } catch {
            setSnack('Could not copy link.');
          }
        }}
        onRegenerate={() => setRegenerateConfirmOpen(true)}
        regenerateBusy={regenerating}
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

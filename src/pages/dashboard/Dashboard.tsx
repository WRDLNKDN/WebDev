import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
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
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// MODULAR COMPONENTS
import { AddProjectDialog } from '../../components/portfolio/dialogs/AddProjectDialog';
import { PortfolioPreviewModal } from '../../components/portfolio/dialogs/PortfolioPreviewModal';
import { PortfolioHighlightsCarousel } from '../../components/portfolio/layout/PortfolioHighlightsCarousel';
import { PortfolioSortableList } from '../../components/portfolio/layout/PortfolioSortableList';
import { ResumeCard } from '../../components/portfolio/cards/ResumeCard';
import { EditProfileDialog } from '../../components/profile/EditProfileDialog';
import { IdentityHeader } from '../../components/profile/identity/IdentityHeader';
import { EditLinksDialog } from '../../components/profile/links/EditLinksDialog';
import { ShareProfileDialog } from '../../components/profile/links/ShareProfileDialog';
import { DashboardLinksSection } from './dashboardLinksSection';

// LOGIC & TYPES
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useAppToast } from '../../context/AppToastContext';
import { IndustryGroupBlock } from '../../components/profile/identity/IndustryGroupBlock';
import { SkillsInterestsPills } from '../../components/profile/identity/SkillsInterestsPills';
import { useProfile } from '../../hooks/useProfile';
import { normalizeIndustryGroups } from '../../lib/profile/industryGroups';
import { buildResumePreviewItem } from '../../lib/portfolio/resumePreviewItem';
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
  const profileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const editDialogReturnFocusRef = useRef<HTMLElement | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useAppToast();

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
  const selectedInterests: string[] =
    Array.isArray(safeNerdCreds.interests) &&
    safeNerdCreds.interests.every((i) => typeof i === 'string')
      ? (safeNerdCreds.interests as string[])
          .map((i) => String(i).trim())
          .filter(Boolean)
      : typeof safeNerdCreds.interests === 'string'
        ? (safeNerdCreds.interests as string)
            .split(',')
            .map((i) => i.trim())
            .filter(Boolean)
        : [];
  const industryGroups = normalizeIndustryGroups(profile);
  const nicheField = (
    profile as unknown as { niche_field?: string }
  )?.niche_field?.trim();
  const handleResumeUpload = async (file: File) => {
    try {
      await uploadResume(file);
      await refresh();
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
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
  const rememberEditDialogTrigger = () => {
    if (typeof document === 'undefined') return;
    const activeElement = document.activeElement;
    editDialogReturnFocusRef.current =
      activeElement instanceof HTMLElement ? activeElement : null;
  };
  const openEditProfileDialog = (options?: { focusBio?: boolean }) => {
    rememberEditDialogTrigger();
    setProfileMenuAnchor(null);
    setEditFocusBio(Boolean(options?.focusBio));
    setIsEditOpen(true);
  };
  const closeEditProfileDialog = () => {
    setIsEditOpen(false);
    setEditFocusBio(false);
    const returnFocusTarget =
      editDialogReturnFocusRef.current ?? profileMenuButtonRef.current;
    setTimeout(() => {
      returnFocusTarget?.focus();
      editDialogReturnFocusRef.current = null;
    }, 0);
  };
  const resumePreviewProject = buildResumePreviewItem({
    url: profile?.resume_url,
    fileName: resumeFileName,
    thumbnailUrl: resumeThumbnailUrl,
    thumbnailStatus: resumeThumbnailStatus,
  });

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
          layoutVariant="three-column"
          displayName={displayName}
          tagline={profile?.tagline ?? undefined}
          bio={bio}
          bioIsPlaceholder={bioIsPlaceholder}
          onAddBio={
            bioIsPlaceholder
              ? () => {
                  openEditProfileDialog({ focusBio: true });
                }
              : undefined
          }
          avatarUrl={avatarUrl}
          slotUnderAvatarLabel={undefined}
          slotUnderAvatar={
            <>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
              >
                <Button
                  ref={profileMenuButtonRef}
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
                      border: '1px solid rgba(156,187,217,0.26)',
                    },
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    openEditProfileDialog();
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
          badges={
            <SkillsInterestsPills
              skills={selectedSkills}
              interests={selectedInterests}
            />
          }
          rightColumn={
            industryGroups.length > 0 || nicheField ? (
              <IndustryGroupBlock
                groups={industryGroups}
                nicheField={nicheField}
              />
            ) : undefined
          }
          actions={undefined}
        />

        <DashboardLinksSection
          loading={loading}
          socials={socialsArray}
          onOpenLinks={() => setIsLinksOpen(true)}
        />

        <Paper
          elevation={0}
          data-testid="dashboard-portfolio-showcase-section"
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
              PORTFOLIO SHOWCASE
            </Typography>
            <input
              ref={resumeFileInputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeInputChange}
            />

            {!profile?.resume_url && projects.length === 0 ? (
              <>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Start by adding links, a resume, or a project to build your
                  public portfolio showcase.
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
                    aria-label="Add resume or project"
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
                          border: '1px solid rgba(156,187,217,0.26)',
                        },
                      },
                    }}
                  >
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
                    aria-label="Add resume or project"
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
                          border: '1px solid rgba(156,187,217,0.26)',
                        },
                      },
                    }}
                  >
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

                <PortfolioHighlightsCarousel
                  projects={projects}
                  onOpenPreview={setPreviewProject}
                />

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
                                  showToast({
                                    message: toMessage(e),
                                    severity: 'error',
                                  });
                                });
                              }}
                              retryThumbnailBusy={updating}
                              onDelete={async () => {
                                try {
                                  await deleteResume();
                                  void refresh();
                                } catch (e) {
                                  showToast({
                                    message: toMessage(e),
                                    severity: 'error',
                                  });
                                }
                              }}
                              deleteBusy={updating}
                              isOwner
                              dragHandle={dragHandle}
                              onOpenPreview={setPreviewProject}
                              previewProject={resumePreviewProject}
                            />
                          )
                        : undefined
                    }
                    isOwner
                    onReorder={async (orderedIds) => {
                      try {
                        await reorderPortfolioItems(orderedIds);
                      } catch (e) {
                        showToast({ message: toMessage(e), severity: 'error' });
                      }
                    }}
                    onDelete={async (id) => {
                      try {
                        await deleteProject(id);
                      } catch (e) {
                        showToast({ message: toMessage(e), severity: 'error' });
                      }
                    }}
                    onToggleHighlight={async (id, isHighlighted) => {
                      try {
                        await toggleProjectHighlight(id, isHighlighted);
                      } catch (e) {
                        showToast({ message: toMessage(e), severity: 'error' });
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
        <DialogTitle
          id="regenerate-share-link-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          Regenerate share link?
          <Tooltip title="Close">
            <IconButton
              aria-label="Close"
              onClick={() => !regenerating && setRegenerateConfirmOpen(false)}
              sx={{ color: 'rgba(255,255,255,0.75)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
                  showToast({ message: toMessage(error), severity: 'error' });
                  return;
                }
                setShareToken(typeof data === 'string' ? data : null);
                setRegenerateConfirmOpen(false);
                showToast({
                  message: 'New link generated. Previous link no longer works.',
                  severity: 'success',
                });
              } catch (e) {
                showToast({ message: toMessage(e), severity: 'error' });
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
        onClose={closeEditProfileDialog}
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
        onSubmit={async (project, files, projectId) => {
          if (projectId) {
            await updateProject(projectId, project, files);
            return;
          }
          await addProject(project, files);
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
            showToast({
              message: 'Link copied to clipboard.',
              severity: 'success',
            });
          } catch {
            showToast({ message: 'Could not copy link.', severity: 'error' });
          }
        }}
        onRegenerate={() => setRegenerateConfirmOpen(true)}
        regenerateBusy={regenerating}
      />
    </Box>
  );
};

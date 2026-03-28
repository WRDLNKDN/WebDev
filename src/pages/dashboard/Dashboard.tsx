import AddIcon from '@mui/icons-material/Add';
import AddLinkIcon from '@mui/icons-material/AddLink';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
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
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// MODULAR COMPONENTS
import { PortfolioHighlightsCarousel } from '../../components/portfolio/layout/PortfolioHighlightsCarousel';
import { PortfolioSortableList } from '../../components/portfolio/layout/PortfolioSortableList';
import { ResumeCard } from '../../components/portfolio/cards/ResumeCard';
import { IdentityHeader } from '../../components/profile/identity/IdentityHeader';
import { InterestsDropdown } from '../../components/profile/identity/InterestsDropdown';

// Lazy load heavy dialogs for mobile performance
const AddProjectDialog = lazy(
  async () =>
    await import('../../components/portfolio/dialogs/AddProjectDialog').then(
      (m) => ({ default: m.AddProjectDialog }),
    ),
);
const PortfolioPreviewModal = lazy(
  async () =>
    await import('../../components/portfolio/dialogs/PortfolioPreviewModal').then(
      (m) => ({ default: m.PortfolioPreviewModal }),
    ),
);
const EditProfileDialog = lazy(
  async () =>
    await import('../../components/profile/EditProfileDialog').then((m) => ({
      default: m.EditProfileDialog,
    })),
);
const EditLinksDialog = lazy(
  async () =>
    await import('../../components/profile/links/EditLinksDialog').then(
      (m) => ({
        default: m.EditLinksDialog,
      }),
    ),
);
const ShareProfileDialog = lazy(
  async () =>
    await import('../../components/profile/links/ShareProfileDialog').then(
      (m) => ({
        default: m.ShareProfileDialog,
      }),
    ),
);
import { DashboardLinksSection } from './dashboardLinksSection';
import { GameRewardsPanel } from './GameRewardsPanel';

// LOGIC & TYPES
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useAppToast } from '../../context/AppToastContext';
import { IndustryGroupBlock } from '../../components/profile/identity/IndustryGroupBlock';
import { SkillsInterestsPills } from '../../components/profile/identity/SkillsInterestsPills';
import { useProfile } from '../../hooks/useProfile';
import { normalizeIndustryGroups } from '../../lib/profile/industryGroups';
import { buildResumePreviewItem } from '../../lib/portfolio/resumePreviewItem';
import { RESUME_UPLOAD_ACCESSIBILITY_DESCRIPTION } from '../../lib/portfolio/resumeUploadLimits';
import { buildShareProfileUrl } from '../../lib/profile/shareProfileUrl';
import { signOut } from '../../lib/auth/signOut';
import { toMessage } from '../../lib/utils/errors';
import {
  getProfanityOverrides,
  getProfanityAllowlist,
  validateProfanity,
  PROFANITY_ERROR_MESSAGE_INTEREST,
} from '../../lib/validation/profanity';
import { supabase } from '../../lib/auth/supabaseClient';
import { denseMenuPaperSxFromTheme } from '../../lib/ui/formSurface';
import { getGlassCardStrong } from '../../theme/candyStyles';
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
  const resumeUploadHintId = useId();
  const { showToast } = useAppToast();
  const theme = useTheme();
  const isMobileLayout = useMediaQuery(theme.breakpoints.down('md'));
  const addMenuPaperSx = useMemo(
    () => ({
      mt: 1.5,
      minWidth: 200,
      maxWidth: 'min(calc(100vw - 24px), 400px)',
      borderRadius: 2,
      ...denseMenuPaperSxFromTheme(theme),
      zIndex: 1300,
      maxHeight: 'calc(100dvh - 100px)',
      overflowX: 'hidden',
      overflowY: 'auto',
      boxShadow:
        theme.palette.mode === 'light'
          ? theme.shadows[12]
          : '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
    }),
    [theme],
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

  // Open Edit Profile when navigated from own profile with state
  useEffect(() => {
    if (state?.openEditDialog) {
      setIsEditOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [state?.openEditDialog, navigate, location.pathname]);

  // Load share token lazily - only when share dialog opens (mobile performance)
  const loadShareToken = useCallback(async () => {
    if (shareToken || shareTokenLoading) return;
    setShareTokenError(null);
    setShareTokenLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'get_or_create_profile_share_token',
      );
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
    } finally {
      setShareTokenLoading(false);
    }
  }, [shareToken, shareTokenLoading]);

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
    uploadResumeThumbnailImage,
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

  // Derived from profile only (must be before useMemos that depend on them)
  const safeNerdCreds: NerdCreds =
    profile?.nerd_creds && typeof profile.nerd_creds === 'object'
      ? (profile.nerd_creds as unknown as NerdCreds)
      : ({} as NerdCreds);

  const resumeThumbnailUrl: string | null =
    typeof safeNerdCreds.resume_thumbnail_url === 'string'
      ? safeNerdCreds.resume_thumbnail_url
      : null;

  const resumeFileName: string | null =
    typeof safeNerdCreds.resume_file_name === 'string'
      ? safeNerdCreds.resume_file_name
      : null;

  const resumeThumbnailStatus: 'pending' | 'complete' | 'failed' | null =
    safeNerdCreds.resume_thumbnail_status === 'pending' ||
    safeNerdCreds.resume_thumbnail_status === 'complete' ||
    safeNerdCreds.resume_thumbnail_status === 'failed'
      ? safeNerdCreds.resume_thumbnail_status
      : null;

  const descriptionFromJoin = safeStr(profile?.additional_context).trim();
  const descriptionFromBio = safeStr(safeNerdCreds.bio).trim();
  const hasDescription = Boolean(descriptionFromBio || descriptionFromJoin);
  /** Prefer saved profile bio over join-time blurb so Edit Profile is the source of truth. */
  const bio = descriptionFromBio || descriptionFromJoin || '';
  const bioIsPlaceholder = !hasDescription;
  const nicheField = (
    profile as unknown as { niche_field?: string }
  )?.niche_field?.trim();

  // Memoize expensive computations for mobile performance (must be before early return)
  const selectedSkills = useMemo(() => {
    if (
      Array.isArray(safeNerdCreds.skills) &&
      safeNerdCreds.skills.every((skill) => typeof skill === 'string')
    ) {
      return (safeNerdCreds.skills as string[])
        .map((skill) => skill.trim())
        .filter(Boolean);
    }
    if (typeof safeNerdCreds.skills === 'string') {
      return safeNerdCreds.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
    }
    return [];
  }, [safeNerdCreds.skills]);

  const selectedInterests = useMemo(() => {
    if (
      Array.isArray(safeNerdCreds.interests) &&
      safeNerdCreds.interests.every((i) => typeof i === 'string')
    ) {
      return (safeNerdCreds.interests as string[])
        .map((i) => String(i).trim())
        .filter(Boolean);
    }
    if (typeof safeNerdCreds.interests === 'string') {
      return (safeNerdCreds.interests as string)
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);
    }
    return [];
  }, [safeNerdCreds.interests]);

  const industryGroups = useMemo(
    () => normalizeIndustryGroups(profile),
    [profile],
  );

  const resumePreviewProject = useMemo(
    () =>
      buildResumePreviewItem({
        url: profile?.resume_url,
        fileName: resumeFileName,
        thumbnailUrl: resumeThumbnailUrl,
        thumbnailStatus: resumeThumbnailStatus,
      }),
    [
      profile?.resume_url,
      resumeFileName,
      resumeThumbnailUrl,
      resumeThumbnailStatus,
    ],
  );

  // Memoize array operations for mobile performance
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const projectUrls = useMemo(
    () => projects.map((p) => p.project_url).filter(Boolean),
    [projects],
  );
  const socialUrls = useMemo(
    () => socialsArray.map((s) => s.url).filter(Boolean),
    [socialsArray],
  );

  // Memoize orderedIds for PortfolioSortableList (must be before early return)
  const orderedIds = useMemo(() => {
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
  }, [projectIds, profile?.resume_url, safeNerdCreds.resume_display_index]);

  // Early return after all hooks
  if (!session) return null;

  const rawName =
    profile?.display_name || session.user.user_metadata?.full_name;
  const displayName = safeStr(rawName, 'Verified Generalist');
  const resolvedAvatarUrl =
    profile?.avatar || session.user.user_metadata?.avatar_url;
  const avatarUrl = ctxAvatarUrl ?? safeStr(resolvedAvatarUrl);

  const handleResumeUpload = async (file: File) => {
    try {
      const result = await uploadResume(file);
      await refresh();
      if (result.sizeNote) {
        showToast({ message: result.sizeNote, severity: 'info' });
      }
      if (result.thumbnailWarning) {
        showToast({
          message: result.thumbnailWarning,
          severity: 'warning',
        });
      }
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    }
  };

  const handleEditReplaceResume = async (file: File) => {
    try {
      const result = await uploadResume(file);
      await refresh();
      if (result.sizeNote) {
        showToast({ message: result.sizeNote, severity: 'info' });
      }
      showToast({
        message: result.thumbnailWarning
          ? `Resume updated. ${result.thumbnailWarning}`
          : 'Resume updated.',
        severity: result.thumbnailWarning ? 'warning' : 'success',
      });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
      throw e;
    }
  };

  const handleEditUploadResumeThumbnail = async (file: File) => {
    try {
      await uploadResumeThumbnailImage(file);
      await refresh();
      showToast({ message: 'Preview image updated.', severity: 'success' });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
      throw e;
    }
  };

  const handleEditRegenerateResumeThumbnail = async () => {
    try {
      await retryResumeThumbnail();
      await refresh();
      showToast({
        message: 'Preview regenerated from your document.',
        severity: 'success',
      });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
      throw e;
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
    // Use requestAnimationFrame for better mobile performance (was setTimeout)
    requestAnimationFrame(() => {
      returnFocusTarget?.focus();
      editDialogReturnFocusRef.current = null;
    });
  };

  const profileMenuButtonStyles = {
    borderColor: 'rgba(45, 212, 191, 0.6)',
    color: '#2dd4bf',
    minHeight: { xs: 44, sm: 40 },
    fontSize: '0.875rem',
    py: { xs: 1, sm: 0.65 },
    px: 1.5,
    touchAction: 'manipulation' as const,
    WebkitTapHighlightColor: 'transparent',
    '&:hover': {
      borderColor: '#2dd4bf',
      bgcolor: 'rgba(45, 212, 191, 0.12)',
    },
    '&:active': {
      bgcolor: 'rgba(45, 212, 191, 0.2)',
    },
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        position: 'relative',
        pt: { xs: 1.25, md: 2.5 },
        pb: {
          xs: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          md: 5,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          insetInline: 0,
          bottom: 0,
          height: { xs: 'min(32vh, 200px)', md: 'min(26vh, 300px)' },
          pointerEvents: 'none',
          zIndex: 0,
          background:
            'linear-gradient(to top, rgba(5,7,15,0.5) 0%, rgba(5,7,15,0.12) 50%, transparent 100%)',
        },
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 1.5, sm: 3 },
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Identity: avatar + summary; interests & profile menu live with skills row. */}
        <IdentityHeader
          layoutVariant="three-column"
          displayName={displayName}
          memberHandle={profile?.handle?.trim() || undefined}
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
          badges={
            <Stack spacing={1.5} sx={{ width: '100%' }}>
              <SkillsInterestsPills
                skills={selectedSkills}
                interests={selectedInterests}
              />
              <GameRewardsPanel />
              <Box
                sx={{
                  pt: 1.5,
                  borderTop: '1px solid rgba(156,187,217,0.18)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 1,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    fontSize: '0.68rem',
                  }}
                >
                  Profile & interests
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  flexWrap="wrap"
                  useFlexGap
                  spacing={{ xs: 1, sm: 1 }}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Box sx={{ flex: { sm: '1 1 220px' }, minWidth: 0 }}>
                    <InterestsDropdown
                      value={selectedInterests}
                      onSave={async (interests) => {
                        try {
                          const [blocklist, allowlist] = await Promise.all([
                            getProfanityOverrides(),
                            getProfanityAllowlist(),
                          ]);
                          for (const value of interests) {
                            validateProfanity(
                              value,
                              blocklist,
                              allowlist,
                              PROFANITY_ERROR_MESSAGE_INTEREST,
                            );
                          }
                          const creds = {
                            ...safeNerdCreds,
                            interests,
                          };
                          await updateProfile({ nerd_creds: creds });
                          await refresh();
                          showToast({
                            message: 'Interests updated.',
                            severity: 'success',
                          });
                        } catch (e) {
                          showToast({
                            message: toMessage(e),
                            severity: 'error',
                          });
                          throw e;
                        }
                      }}
                      disabled={loading}
                    />
                  </Box>
                  <Box sx={{ flex: { sm: '0 0 auto' } }}>
                    <Button
                      ref={profileMenuButtonRef}
                      id="profile-menu-button"
                      variant="outlined"
                      size="small"
                      fullWidth
                      sx={{
                        ...profileMenuButtonStyles,
                        width: { xs: '100%', sm: 'auto' },
                      }}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setProfileMenuAnchor(e.currentTarget);
                      }}
                      onTouchStart={(
                        e: React.TouchEvent<HTMLButtonElement>,
                      ) => {
                        e.stopPropagation();
                        setProfileMenuAnchor(e.currentTarget);
                      }}
                      endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                      disabled={loading}
                      aria-label="Profile menu"
                      aria-haspopup="true"
                      aria-expanded={Boolean(profileMenuAnchor)}
                    >
                      Profile
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Stack>
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

        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={() => setProfileMenuAnchor(null)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: isMobileLayout ? 'left' : 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: isMobileLayout ? 'left' : 'right',
          }}
          disableScrollLock={false}
          disablePortal={false}
          MenuListProps={{
            'aria-labelledby': 'profile-menu-button',
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
            sx: {
              py: 0.5,
              overflowX: 'hidden',
            },
          }}
          slotProps={{
            paper: {
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
              sx: (theme) => ({
                mt: 1.5,
                minWidth: 200,
                maxWidth: 'min(calc(100vw - 24px), 320px)',
                borderRadius: 2,
                bgcolor: theme.palette.background.paper,
                border: '1px solid rgba(156,187,217,0.26)',
                zIndex: 1300,
                maxHeight: 'calc(100dvh - 100px)',
                overflowX: 'hidden',
                overflowY: 'auto',
                boxShadow:
                  theme.palette.mode === 'light'
                    ? '0 8px 24px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(0,0,0,0.05)'
                    : '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
              }),
            },
            root: {
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
            },
          }}
        >
          {profile?.handle && (
            <MenuItem
              onClick={() => {
                setProfileMenuAnchor(null);
                navigate(`/p/h~${encodeURIComponent(profile.handle)}`);
              }}
              onTouchStart={(e: React.TouchEvent) => {
                e.preventDefault();
                setProfileMenuAnchor(null);
                navigate(`/p/h~${encodeURIComponent(profile.handle)}`);
              }}
              sx={{
                py: 1.5,
                minHeight: 48,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              View Profile
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              setProfileMenuAnchor(null);
              openEditProfileDialog();
            }}
            onTouchStart={(e: React.TouchEvent) => {
              e.preventDefault();
              setProfileMenuAnchor(null);
              openEditProfileDialog();
            }}
            sx={{
              py: 1.5,
              minHeight: 48,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Edit Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              setProfileMenuAnchor(null);
              navigate('/dashboard/settings');
            }}
            onTouchStart={(e: React.TouchEvent) => {
              e.preventDefault();
              setProfileMenuAnchor(null);
              navigate('/dashboard/settings');
            }}
            sx={{
              py: 1.5,
              minHeight: 48,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Account & settings
          </MenuItem>
          <MenuItem
            onClick={async () => {
              setProfileMenuAnchor(null);
              await loadShareToken();
              setIsShareDialogOpen(true);
            }}
            onTouchStart={async (e: React.TouchEvent) => {
              e.preventDefault();
              setProfileMenuAnchor(null);
              await loadShareToken();
              setIsShareDialogOpen(true);
            }}
            sx={{
              py: 1.5,
              minHeight: 48,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Share My Profile
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={async () => {
              setProfileMenuAnchor(null);
              await signOut({ redirectTo: '/' });
              navigate('/', { replace: true });
            }}
            onTouchStart={async (e: React.TouchEvent) => {
              e.preventDefault();
              setProfileMenuAnchor(null);
              await signOut({ redirectTo: '/' });
              navigate('/', { replace: true });
            }}
            sx={{
              py: 1.5,
              minHeight: 48,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              color: 'error.main',
            }}
          >
            Sign Out
          </MenuItem>
        </Menu>

        <DashboardLinksSection
          loading={loading}
          socials={socialsArray}
          onOpenLinks={() => setIsLinksOpen(true)}
        />

        <Paper
          elevation={0}
          data-testid="dashboard-portfolio-showcase-section"
          sx={(theme) => ({
            ...getGlassCardStrong(theme),
            p: { xs: 2, md: 3 },
            overflowX: 'hidden',
            width: '100%',
            maxWidth: '100%',
          })}
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
                mb: 1.25,
                letterSpacing: 2,
                color: 'text.secondary',
                fontWeight: 600,
                maxWidth: '100%',
                minWidth: 0,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              PORTFOLIO SHOWCASE
            </Typography>
            <Typography
              id={resumeUploadHintId}
              component="span"
              variant="body2"
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '1px',
                height: '1px',
                p: 0,
                m: '-1px',
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                border: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {RESUME_UPLOAD_ACCESSIBILITY_DESCRIPTION}
            </Typography>
            <input
              ref={resumeFileInputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-describedby={resumeUploadHintId}
              onChange={handleResumeInputChange}
            />

            {!profile?.resume_url && projects.length === 0 ? (
              <>
                <Box
                  sx={{
                    width: '100%',
                    borderRadius: 2,
                    border: '1px solid rgba(156,187,217,0.26)',
                    bgcolor: 'rgba(7,11,22,0.55)',
                    p: { xs: 2, sm: 2.5 },
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    component="h3"
                    sx={{ fontWeight: 700, mb: 0.75 }}
                  >
                    Build your public showcase
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, maxWidth: 640 }}
                  >
                    Add a project, upload a resume, and wire up outbound links
                    so this space tells a complete story—not an empty frame.
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    flexWrap="wrap"
                    useFlexGap
                    spacing={1}
                    sx={{ mb: 2 }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FolderOutlinedIcon sx={{ fontSize: 18 }} />}
                      disabled={loading}
                      onClick={() => openNewProjectDialog()}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: 'rgba(156,187,217,0.42)',
                        minHeight: { xs: 44, sm: 40 },
                      }}
                    >
                      Add project
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ArticleOutlinedIcon sx={{ fontSize: 18 }} />}
                      disabled={loading}
                      onClick={() => openResumePicker()}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: 'rgba(156,187,217,0.42)',
                        minHeight: { xs: 44, sm: 40 },
                      }}
                    >
                      Add resume
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddLinkIcon sx={{ fontSize: 18 }} />}
                      disabled={loading}
                      onClick={() => setIsLinksOpen(true)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: 'rgba(156,187,217,0.42)',
                        minHeight: { xs: 44, sm: 40 },
                      }}
                    >
                      Add links
                    </Button>
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                  >
                    Or pick from the menu
                  </Typography>
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={1}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setAddMenuAnchor(e.currentTarget);
                      }}
                      onTouchStart={(
                        e: React.TouchEvent<HTMLButtonElement>,
                      ) => {
                        e.stopPropagation();
                        setAddMenuAnchor(e.currentTarget);
                      }}
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
                        minHeight: { xs: 44, sm: 34 },
                        py: { xs: 1, sm: 0.5 },
                        px: 1.5,
                        fontSize: '0.8125rem',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        '&:hover': {
                          background:
                            'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)',
                        },
                        '&:active': {
                          background:
                            'linear-gradient(90deg, #0a4d47 0%, #0d9488 100%)',
                        },
                      }}
                    >
                      Add
                    </Button>
                  </Stack>
                  <Menu
                    anchorEl={addMenuAnchor}
                    open={Boolean(addMenuAnchor)}
                    onClose={() => setAddMenuAnchor(null)}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    disableScrollLock={false}
                    disablePortal={false}
                    MenuListProps={{
                      onClick: (e: React.MouseEvent) => e.stopPropagation(),
                      sx: {
                        py: 0.5,
                        overflowX: 'hidden',
                      },
                    }}
                    slotProps={{
                      paper: {
                        onClick: (e: React.MouseEvent) => e.stopPropagation(),
                        sx: addMenuPaperSx,
                      },
                      root: {
                        onClick: (e: React.MouseEvent) => e.stopPropagation(),
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        setAddMenuAnchor(null);
                        openResumePicker();
                      }}
                      onTouchStart={(e: React.TouchEvent) => {
                        e.preventDefault();
                        setAddMenuAnchor(null);
                        openResumePicker();
                      }}
                      sx={{
                        py: 1.5,
                        minHeight: 48,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      + Add Resume
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setAddMenuAnchor(null);
                        openNewProjectDialog();
                      }}
                      onTouchStart={(e: React.TouchEvent) => {
                        e.preventDefault();
                        setAddMenuAnchor(null);
                        openNewProjectDialog();
                      }}
                      sx={{
                        py: 1.5,
                        minHeight: 48,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      + Add Project
                    </MenuItem>
                  </Menu>
                </Box>
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
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      setAddMenuAnchor(e.currentTarget);
                    }}
                    onTouchStart={(e: React.TouchEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      setAddMenuAnchor(e.currentTarget);
                    }}
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
                      minHeight: { xs: 44, sm: 34 },
                      py: { xs: 1, sm: 0.5 },
                      px: 1.5,
                      fontSize: '0.8125rem',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      '&:hover': {
                        background:
                          'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)',
                      },
                      '&:active': {
                        background:
                          'linear-gradient(90deg, #0a4d47 0%, #0d9488 100%)',
                      },
                    }}
                  >
                    Add
                  </Button>
                  <Menu
                    anchorEl={addMenuAnchor}
                    open={Boolean(addMenuAnchor)}
                    onClose={() => setAddMenuAnchor(null)}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    disableScrollLock={false}
                    disablePortal={false}
                    MenuListProps={{
                      onClick: (e: React.MouseEvent) => e.stopPropagation(),
                      sx: {
                        py: 0.5,
                        overflowX: 'hidden',
                      },
                    }}
                    slotProps={{
                      paper: {
                        onClick: (e: React.MouseEvent) => e.stopPropagation(),
                        sx: addMenuPaperSx,
                      },
                      root: {
                        onClick: (e: React.MouseEvent) => e.stopPropagation(),
                      },
                    }}
                  >
                    {!profile?.resume_url && (
                      <MenuItem
                        onClick={() => {
                          setAddMenuAnchor(null);
                          openResumePicker();
                        }}
                        onTouchStart={(e: React.TouchEvent) => {
                          e.preventDefault();
                          setAddMenuAnchor(null);
                          openResumePicker();
                        }}
                        sx={{
                          py: 1.5,
                          minHeight: 48,
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        + Add Resume
                      </MenuItem>
                    )}
                    <MenuItem
                      onClick={() => {
                        setAddMenuAnchor(null);
                        openNewProjectDialog();
                      }}
                      onTouchStart={(e: React.TouchEvent) => {
                        e.preventDefault();
                        setAddMenuAnchor(null);
                        openNewProjectDialog();
                      }}
                      sx={{
                        py: 1.5,
                        minHeight: 48,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                      }}
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
                    orderedIds={orderedIds}
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
                              onRetryThumbnail={async () => {
                                try {
                                  await retryResumeThumbnail();
                                  // Refresh data after successful retry to update thumbnail status
                                  await refresh();
                                } catch (e) {
                                  showToast({
                                    message: toMessage(e),
                                    severity: 'error',
                                  });
                                }
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
                              onEditReplaceResume={handleEditReplaceResume}
                              onEditUploadThumbnail={
                                handleEditUploadResumeThumbnail
                              }
                              onEditRegenerateThumbnail={
                                handleEditRegenerateResumeThumbnail
                              }
                              editBusy={updating}
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

      <Suspense fallback={null}>
        <EditProfileDialog
          open={isEditOpen}
          onClose={closeEditProfileDialog}
          profile={profile}
          focusBioOnOpen={editFocusBio}
          avatarFallback={
            session?.user?.user_metadata?.avatar_url as string | undefined
          }
          onUpdate={updateProfile}
          onUpload={uploadAvatar}
          onAvatarChanged={() => {
            refresh().catch(() => {});
            refreshAvatar().catch(() => {});
          }}
          onProfileSaved={() => {
            refresh().catch(() => {});
          }}
        />
        <EditLinksDialog
          open={isLinksOpen}
          onClose={() => setIsLinksOpen(false)}
          currentLinks={socialsArray}
          existingProjectUrls={projectUrls}
          onUpdate={async (updates) => {
            if (Array.isArray(updates.socials)) {
              lastLinksRef.current = updates.socials;
              setSavedLinksOverride(updates.socials);
            }
            await updateProfile(updates);
            // Refetch after a short delay so profile.socials is in sync with DB
            // Reduced delay for mobile performance (was 350ms)
            await new Promise((r) => setTimeout(r, 200));
            await refresh();
          }}
        />
        <AddProjectDialog
          open={isProjectDialogOpen}
          onClose={closeProjectDialog}
          existingProjects={projects}
          existingLinkUrls={socialUrls}
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
      </Suspense>
    </Box>
  );
};

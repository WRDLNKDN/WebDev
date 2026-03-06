import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
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

// LOGIC & TYPES
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useProfile } from '../../hooks/useProfile';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { GLASS_CARD } from '../../theme/candyStyles';
import type { NerdCreds } from '../../types/profile';
import type { PortfolioItem } from '../../types/portfolio';
import { safeStr } from '../../utils/stringUtils';

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { openEditDialog?: boolean } | undefined;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isLinksOpen, setIsLinksOpen] = useState(false);
  const [previewProject, setPreviewProject] = useState<PortfolioItem | null>(
    null,
  );
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareTokenError, setShareTokenError] = useState<string | null>(null);
  const [shareTokenLoading, setShareTokenLoading] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] =
    useState<HTMLElement | null>(null);
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
    deleteProject,
    reorderProjects,
    uploadResume,
    deleteResume,
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
  const selectedIndustries = [
    safeStr(profile?.industry),
    safeStr(
      (profile as unknown as { secondary_industry?: string })
        ?.secondary_industry,
    ),
  ].filter(Boolean);
  const nicheField = (
    profile as unknown as { niche_field?: string }
  )?.niche_field?.trim();
  const hasVisibleSocialLinks = (profile?.socials ?? []).some(
    (link) => link.isVisible,
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
                  endIcon={<KeyboardArrowDownIcon />}
                  disabled={loading}
                  aria-label="Profile menu"
                  aria-haspopup="true"
                  aria-expanded={Boolean(profileMenuAnchor)}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    minHeight: { xs: 36, sm: 32 },
                    fontSize: '0.8rem',
                    px: 1.5,
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
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    minHeight: { xs: 36, sm: 32 },
                    fontSize: '0.8rem',
                    px: 1.5,
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
                    href={`/profile/${profile.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setProfileMenuAnchor(null)}
                    sx={{ py: 1.25 }}
                  >
                    View Profile
                  </MenuItem>
                )}
              </Menu>
            </>
          }
        />

        {/* Share my profile: tokenized public link */}
        <Paper
          elevation={0}
          sx={{
            ...GLASS_CARD,
            p: { xs: 2, md: 3 },
            mt: { xs: 2, md: 3 },
            width: '100%',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              mb: 1.5,
              letterSpacing: 2,
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            Share my profile
          </Typography>
          {shareTokenLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading link…
            </Typography>
          ) : shareToken ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Anyone with this link can view a read-only version of your
                profile. Your handle is not in the URL.
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/p/${shareToken}`
                    : `/p/${shareToken}`
                }
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem',
                  },
                }}
                InputProps={{ readOnly: true }}
                inputProps={{ 'aria-label': 'Public profile URL' }}
              />
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={async () => {
                    const url =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/p/${shareToken}`
                        : `${shareToken}`;
                    try {
                      await navigator.clipboard.writeText(url);
                      setSnack('Link copied to clipboard.');
                    } catch {
                      setSnack('Could not copy link.');
                    }
                  }}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    textTransform: 'none',
                  }}
                >
                  Copy link
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => setRegenerateConfirmOpen(true)}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    textTransform: 'none',
                  }}
                >
                  Regenerate link
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {shareTokenError ?? 'Unable to load share link. Try refreshing.'}
            </Typography>
          )}
        </Paper>

        {/* PORTFOLIO: Resume + Projects — empty state or grid */}
        <Paper
          elevation={0}
          sx={{
            ...GLASS_CARD,
            p: { xs: 2, md: 3 },
            overflowX: 'hidden',
            width: '100%',
            maxWidth: '100%',
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

          {!profile?.resume_url && projects.length === 0 ? (
            /* Empty state: message + primary CTA + secondary link */
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your profile is empty.
              </Typography>
              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="center"
                gap={1}
                sx={{ alignItems: 'center' }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsAddProjectOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    color: 'white',
                    background:
                      'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)',
                    '&:hover': {
                      background:
                        'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)',
                    },
                  }}
                >
                  Add your first project
                </Button>
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                >
                  or
                </Typography>
                <input
                  ref={resumeFileInputRef}
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleResumeUpload(f);
                  }}
                />
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => resumeFileInputRef.current?.click()}
                  sx={{
                    color: 'primary.main',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Upload a resume
                </Link>
              </Stack>
            </>
          ) : (
            <>
              {/* Action buttons when portfolio has content */}
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 600,
                    minHeight: 28,
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.8125rem',
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
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={() => setIsAddProjectOpen(true)}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 600,
                    minHeight: 28,
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.8125rem',
                  }}
                >
                  Add Project
                </Button>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(3, minmax(0, 1fr))',
                  },
                  justifyItems: { xs: 'stretch', sm: 'center' },
                  alignItems: 'start',
                }}
              >
                {profile?.resume_url ? (
                  <ResumeCard
                    url={profile?.resume_url}
                    thumbnailUrl={resumeThumbnailUrl}
                    thumbnailStatus={resumeThumbnailStatus}
                    thumbnailError={
                      typeof safeNerdCreds.resume_thumbnail_error === 'string'
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
                  />
                ) : null}

                <PortfolioSortableList
                  projects={projects}
                  isOwner
                  onReorder={async (orderedIds) => {
                    try {
                      await reorderProjects(orderedIds);
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
                  onOpenPreview={setPreviewProject}
                />
              </Box>
            </>
          )}
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
      <PortfolioPreviewModal
        project={previewProject}
        open={Boolean(previewProject)}
        onClose={() => setPreviewProject(null)}
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

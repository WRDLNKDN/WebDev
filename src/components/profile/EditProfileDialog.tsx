import { Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_AVATAR_URL } from '../../config/avatarPresets';
import { INTERESTS_MAX } from '../../constants/interestTaxonomy';
import { useAppToast } from '../../context/AppToastContext';
import { supabase } from '../../lib/auth/supabaseClient';
import { validateIndustryGroups } from '../../lib/profile/validateIndustryGroups';
import {
  parseNicheValues,
  serializeNicheValues,
} from '../../lib/profile/nicheValues';
import {
  getProfanityOverrides,
  getProfanityAllowlist,
  validateProfanity,
  PROFANITY_ERROR_MESSAGE_INTEREST,
} from '../../lib/validation/profanity';
import { toMessage } from '../../lib/utils/errors';
import type {
  DashboardProfile,
  IndustryGroup,
  NerdCreds,
} from '../../types/profile';
import { EditProfileBasicSection } from './editProfileDialog/EditProfileBasicSection';
import { sectionPanelSxFromTheme } from '../../lib/ui/formSurface';
import {
  dialogActionsSafeAreaSx,
  mergeFullScreenDialogPaperSx,
} from '../../lib/ui/fullScreenDialogSx';
import {
  AVATAR_GRADIENT,
  BORDER_COLOR,
  getGlassModalSx,
  HANDLE_CHECK_DEBOUNCE_MS,
  PURPLE_ACCENT,
  safeStr,
} from './editProfileDialog/constants';
import { EditProfileDetailsSection } from './editProfileDialog/EditProfileDetailsSection';
import { EditProfileIndustrySection } from './editProfileDialog/EditProfileIndustrySection';
import type { EditProfileFormData } from './editProfileDialog/types';
import { JoinInterestsSelector } from '../join/profile/JoinInterestsSelector';

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  profile: DashboardProfile | null;
  avatarFallback?: string | null;
  onUpdate: (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => Promise<void>;
  onUpload: (file: File) => Promise<string | undefined>;
  onAvatarChanged?: () => void;
  /** Optional: refetch profile/projects after a successful save (e.g. dashboard). */
  onProfileSaved?: () => void;
  focusBioOnOpen?: boolean;
};

function buildProfileDraftSnapshot(params: {
  formData: EditProfileFormData;
  avatarUrl: string | null;
}): string {
  return JSON.stringify({
    handle: params.formData.handle.trim(),
    pronouns: params.formData.pronouns.trim(),
    bio: params.formData.bio,
    skills: params.formData.skills,
    interests: params.formData.interests.slice(0, INTERESTS_MAX),
    industries: params.formData.industries.map((group) => ({
      industry: group.industry.trim(),
      sub_industries: group.sub_industries.map((value) => value.trim()),
    })),
    niche_field: serializeNicheValues(
      parseNicheValues(params.formData.niche_field),
    ),
    location: params.formData.location.trim(),
    profile_visibility: params.formData.profile_visibility,
    avatar: params.avatarUrl,
  });
}

export const EditProfileDialog = ({
  open,
  onClose,
  profile,
  avatarFallback,
  onUpdate,
  onUpload,
  onAvatarChanged,
  onProfileSaved,
  focusBioOnOpen = false,
}: EditProfileDialogProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const unsavedFullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bioInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const handleCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const latestHandleRef = useRef('');

  const [formData, setFormData] = useState<EditProfileFormData>({
    handle: '',
    pronouns: '',
    bio: '',
    skills: '',
    interests: [],
    industries: [{ industry: '', sub_industries: [] }] as IndustryGroup[],
    niche_field: '',
    location: '',
    profile_visibility: 'members_only',
  });
  const [busy, setBusy] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null,
  );
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  const initialSnapshotRef = useRef('');
  const pendingActionRef = useRef<(() => void) | null>(null);
  const { showToast } = useAppToast();

  useEffect(() => {
    if (!open || !focusBioOnOpen) return;
    const timer = setTimeout(() => {
      const el = bioInputRef.current;
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [open, focusBioOnOpen]);

  useEffect(() => {
    if (!open || !profile) return;
    if (handleCheckTimeoutRef.current) {
      clearTimeout(handleCheckTimeoutRef.current);
      handleCheckTimeoutRef.current = null;
    }

    const creds = (profile.nerd_creds as Record<string, unknown>) || {};
    const prof = profile as unknown as Record<string, unknown>;
    const handle = safeStr(profile.handle);
    latestHandleRef.current = handle;

    const rawIndustries = prof.industries as IndustryGroup[] | undefined;
    const industries =
      Array.isArray(rawIndustries) && rawIndustries.length > 0
        ? rawIndustries.map((group) => ({
            industry: typeof group?.industry === 'string' ? group.industry : '',
            sub_industries: Array.isArray(group?.sub_industries)
              ? (group.sub_industries as string[]).filter(
                  (s): s is string => typeof s === 'string',
                )
              : [],
          }))
        : [
            {
              industry: safeStr(prof.industry),
              sub_industries: (prof.secondary_industry as string)?.trim()
                ? [safeStr(prof.secondary_industry)]
                : [],
            },
          ];

    const rawInterests = creds.interests;
    const interests =
      Array.isArray(rawInterests) &&
      rawInterests.every((i) => typeof i === 'string')
        ? (rawInterests as string[])
            .map((i) => String(i).trim())
            .filter(Boolean)
        : typeof rawInterests === 'string'
          ? (rawInterests as string)
              .split(',')
              .map((i) => i.trim())
              .filter(Boolean)
          : [];

    const nextFormData: EditProfileFormData = {
      handle,
      pronouns: safeStr(profile.pronouns),
      bio: safeStr(creds.bio),
      skills: safeStr(
        Array.isArray(creds.skills)
          ? (creds.skills as string[]).join(', ')
          : typeof creds.skills === 'string'
            ? creds.skills
            : '',
      ),
      interests: interests.slice(0, INTERESTS_MAX),
      industries,
      niche_field: serializeNicheValues(
        parseNicheValues(safeStr(prof.niche_field)),
      ),
      location: safeStr(prof.location),
      profile_visibility: (prof.profile_visibility === 'connections_only'
        ? 'connections_only'
        : 'members_only') as EditProfileFormData['profile_visibility'],
    };
    setFormData(nextFormData);
    setUploadedAvatarUrl(null);
    setUnsavedConfirmOpen(false);
    pendingActionRef.current = null;
    initialSnapshotRef.current = buildProfileDraftSnapshot({
      formData: nextFormData,
      avatarUrl: profile.avatar ?? null,
    });
  }, [open, profile]);

  const draftSnapshot = useMemo(
    () =>
      buildProfileDraftSnapshot({
        formData,
        avatarUrl: uploadedAvatarUrl ?? profile?.avatar ?? null,
      }),
    [formData, profile?.avatar, uploadedAvatarUrl],
  );

  const sectionPanelSx = useMemo(() => sectionPanelSxFromTheme(theme), [theme]);

  const isDirty = initialSnapshotRef.current !== draftSnapshot;

  useEffect(
    () => () => {
      if (handleCheckTimeoutRef.current)
        clearTimeout(handleCheckTimeoutRef.current);
    },
    [],
  );

  const checkHandle = async (value: string) => {
    if (value.length < 3) return setHandleAvailable(null);
    if (!profile) return;
    if (value === profile.handle) return setHandleAvailable(true);

    setCheckingHandle(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('handle')
        .eq('handle', value)
        .maybeSingle();
      if (latestHandleRef.current === value) setHandleAvailable(!data);
    } finally {
      if (latestHandleRef.current === value) setCheckingHandle(false);
    }
  };

  const handleSave = async () => {
    if (handleAvailable === false || checkingHandle) return;
    const validation = validateIndustryGroups(formData.industries);
    if (!validation.ok) {
      showToast({ message: validation.message, severity: 'warning' });
      return;
    }

    const industriesToSave = formData.industries
      .filter((g) => g.industry?.trim())
      .map((g) => ({
        industry: g.industry.trim(),
        sub_industries: g.sub_industries.slice(0, 8),
      }));
    const first = industriesToSave[0];

    try {
      setBusy(true);
      const [blocklist, allowlist] = await Promise.all([
        getProfanityOverrides(),
        getProfanityAllowlist(),
      ]);
      validateProfanity(formData.bio, blocklist, allowlist);
      for (const value of parseNicheValues(formData.niche_field)) {
        validateProfanity(value, blocklist, allowlist);
      }
      const interestsToSave = formData.interests.slice(0, INTERESTS_MAX);
      for (const value of interestsToSave) {
        validateProfanity(
          value,
          blocklist,
          allowlist,
          PROFANITY_ERROR_MESSAGE_INTEREST,
        );
      }
      const skillsArr = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await onUpdate({
        handle: formData.handle,
        pronouns: formData.pronouns,
        industry: first?.industry ?? null,
        secondary_industry: first?.sub_industries?.[0]?.trim() || null,
        industries: industriesToSave,
        niche_field:
          serializeNicheValues(parseNicheValues(formData.niche_field)) || null,
        location: formData.location || null,
        profile_visibility: formData.profile_visibility,
        nerd_creds: {
          bio: formData.bio,
          skills: skillsArr.length ? skillsArr : undefined,
          interests: interestsToSave.length ? interestsToSave : undefined,
        },
      });
      showToast({
        message: 'Profile updated successfully!',
        severity: 'success',
      });
      onProfileSaved?.();
      initialSnapshotRef.current = draftSnapshot;
      const pendingAction = pendingActionRef.current;
      pendingActionRef.current = null;
      setTimeout(() => {
        onClose();
        pendingAction?.();
      }, 1200);
    } catch (cause) {
      console.error(cause);
      showToast({ message: toMessage(cause), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      showToast({ message: 'File too large. Max 6MB.', severity: 'warning' });
      event.target.value = '';
      return;
    }
    try {
      setBusy(true);
      const url = await onUpload(file);
      if (url) {
        setUploadedAvatarUrl(url);
        showToast({ message: 'Avatar updated.', severity: 'success' });
        onAvatarChanged?.();
      }
    } catch (cause) {
      console.error(cause);
      showToast({ message: toMessage(cause), severity: 'error' });
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const currentAvatar =
    uploadedAvatarUrl ||
    profile?.avatar ||
    avatarFallback ||
    DEFAULT_AVATAR_URL ||
    null;
  const previewURL = `http://localhost:5173/profile/${formData.handle}`;

  const handleRequestClose = (nextAction?: () => void) => {
    if (busy) return;
    if (!isDirty) {
      pendingActionRef.current = null;
      onClose();
      nextAction?.();
      return;
    }
    pendingActionRef.current = nextAction ?? null;
    setUnsavedConfirmOpen(true);
  };

  const handleDialogClose = (
    _event: object,
    _reason: 'backdropClick' | 'escapeKeyDown',
  ) => {
    handleRequestClose();
  };

  const handleDiscardAndClose = () => {
    setUnsavedConfirmOpen(false);
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    onClose();
    pendingAction?.();
  };

  const handleConfirmSave = async () => {
    setUnsavedConfirmOpen(false);
    await handleSave();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleDialogClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: mergeFullScreenDialogPaperSx(fullScreen, getGlassModalSx(theme)),
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
            borderBottom: `1px solid ${isLight ? theme.palette.divider : BORDER_COLOR}`,
          }}
        >
          <Typography
            variant="h6"
            component="span"
            sx={{
              fontWeight: 600,
              background: AVATAR_GRADIENT,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            EDIT <span style={{ color: PURPLE_ACCENT }}>PROFILE</span>
          </Typography>
          <Tooltip title="Close">
            <span>
              <IconButton
                onClick={() => handleRequestClose()}
                disabled={busy}
                aria-label="Close"
                sx={{
                  color: isLight ? 'text.secondary' : 'rgba(255,255,255,0.6)',
                  '&:hover': {
                    color: isLight ? 'text.primary' : 'white',
                    bgcolor: 'rgba(56,132,210,0.12)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </span>
          </Tooltip>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 2,
            px: 3,
            pb: fullScreen
              ? 'calc(16px + env(safe-area-inset-bottom, 0px))'
              : 2,
          }}
        >
          {busy && !uploadedAvatarUrl ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: PURPLE_ACCENT }} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Box sx={sectionPanelSx}>
                <EditProfileBasicSection
                  busy={busy}
                  formData={formData}
                  previewURL={previewURL}
                  checkingHandle={checkingHandle}
                  handleAvailable={handleAvailable}
                  fileInputRef={fileInputRef}
                  currentAvatar={currentAvatar}
                  onFileChange={(e) => void handleFileChange(e)}
                  onHandleChange={(value) => {
                    const normalized = value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '');
                    latestHandleRef.current = normalized;
                    setFormData((prev) => ({ ...prev, handle: normalized }));
                    if (handleCheckTimeoutRef.current)
                      clearTimeout(handleCheckTimeoutRef.current);
                    if (normalized.length < 3) return setHandleAvailable(null);
                    handleCheckTimeoutRef.current = setTimeout(() => {
                      handleCheckTimeoutRef.current = null;
                      void checkHandle(normalized);
                    }, HANDLE_CHECK_DEBOUNCE_MS);
                  }}
                  onPronounsChange={(value) =>
                    setFormData((prev) => ({ ...prev, pronouns: value }))
                  }
                />
              </Box>

              <Box sx={sectionPanelSx}>
                <EditProfileIndustrySection
                  busy={busy}
                  formData={formData}
                  onChange={(updater) => setFormData((prev) => updater(prev))}
                />
              </Box>

              <Box
                sx={sectionPanelSx}
                data-testid="edit-profile-interests-section"
              >
                <JoinInterestsSelector
                  value={formData.interests}
                  onChange={(next) =>
                    setFormData((prev) => ({
                      ...prev,
                      interests: next.slice(0, INTERESTS_MAX),
                    }))
                  }
                  disabled={busy}
                  showDescription={false}
                />
              </Box>

              <Box sx={sectionPanelSx}>
                <EditProfileDetailsSection
                  busy={busy}
                  checkingHandle={checkingHandle}
                  canSave={
                    !busy && handleAvailable !== false && !checkingHandle
                  }
                  onClose={handleRequestClose}
                  onSave={() => void handleSave()}
                  bioInputRef={bioInputRef}
                  formData={formData}
                  onChange={(field, value) =>
                    setFormData((prev) => ({ ...prev, [field]: value }))
                  }
                  onVisibilityChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      profile_visibility: value,
                    }))
                  }
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={unsavedConfirmOpen}
        onClose={() => setUnsavedConfirmOpen(false)}
        fullScreen={unsavedFullScreen}
        aria-labelledby="edit-profile-unsaved-title"
        aria-describedby="edit-profile-unsaved-desc"
        PaperProps={{
          sx: mergeFullScreenDialogPaperSx(unsavedFullScreen, {}),
        }}
      >
        <DialogTitle id="edit-profile-unsaved-title">
          Unsaved changes
        </DialogTitle>
        <DialogContent>
          <Typography id="edit-profile-unsaved-desc">
            You have unsaved profile changes. Save before closing?
          </Typography>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx(unsavedFullScreen)}>
          <Button onClick={() => setUnsavedConfirmOpen(false)} color="inherit">
            Continue Editing
          </Button>
          <Button onClick={handleDiscardAndClose} color="inherit">
            Discard
          </Button>
          <Button variant="contained" onClick={() => void handleConfirmSave()}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

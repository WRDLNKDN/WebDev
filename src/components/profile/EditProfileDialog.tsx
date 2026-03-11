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
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AVATAR_PRESETS, DEFAULT_AVATAR_URL } from '../../config/avatarPresets';
import { supabase } from '../../lib/auth/supabaseClient';
import { validateIndustryGroups } from '../../lib/profile/validateIndustryGroups';
import { toMessage } from '../../lib/utils/errors';
import type {
  DashboardProfile,
  IndustryGroup,
  NerdCreds,
} from '../../types/profile';
import { EditProfileBasicSection } from './editProfileDialog/EditProfileBasicSection';
import {
  AVATAR_GRADIENT,
  BORDER_COLOR,
  GLASS_MODAL,
  HANDLE_CHECK_DEBOUNCE_MS,
  PURPLE_ACCENT,
  safeStr,
} from './editProfileDialog/constants';
import { EditProfileDetailsSection } from './editProfileDialog/EditProfileDetailsSection';
import { EditProfileIndustrySection } from './editProfileDialog/EditProfileIndustrySection';
import type { EditProfileFormData } from './editProfileDialog/types';

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  profile: DashboardProfile | null;
  hasWeirdling?: boolean;
  avatarFallback?: string | null;
  currentResolvedAvatarUrl?: string | null;
  onUpdate: (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => Promise<void>;
  onUpload: (file: File) => Promise<string | undefined>;
  onManageLinks?: () => void;
  onAvatarChanged?: () => void;
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
    industries: params.formData.industries.map((group) => ({
      industry: group.industry.trim(),
      sub_industries: group.sub_industries.map((value) => value.trim()),
    })),
    niche_field: params.formData.niche_field.trim(),
    location: params.formData.location.trim(),
    profile_visibility: params.formData.profile_visibility,
    avatar: params.avatarUrl,
  });
}

export const EditProfileDialog = ({
  open,
  onClose,
  profile,
  hasWeirdling: _hasWeirdling = false,
  avatarFallback,
  currentResolvedAvatarUrl,
  onUpdate,
  onUpload,
  onManageLinks,
  onAvatarChanged,
  focusBioOnOpen = false,
}: EditProfileDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
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
    industries: [{ industry: '', sub_industries: [] }] as IndustryGroup[],
    niche_field: '',
    location: '',
    profile_visibility: 'members_only',
  });
  const [busy, setBusy] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null,
  );
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  const initialSnapshotRef = useRef('');
  const pendingActionRef = useRef<(() => void) | null>(null);

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
      industries,
      niche_field: safeStr(prof.niche_field),
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
      setToastMessage(validation.message);
      setShowToast(true);
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
        niche_field: formData.niche_field?.trim() || null,
        location: formData.location || null,
        profile_visibility: formData.profile_visibility,
        nerd_creds: {
          bio: formData.bio,
          skills: skillsArr.length ? skillsArr : undefined,
        },
      });
      setToastMessage('Profile updated successfully!');
      setShowToast(true);
      initialSnapshotRef.current = draftSnapshot;
      const pendingAction = pendingActionRef.current;
      pendingActionRef.current = null;
      setTimeout(() => {
        onClose();
        pendingAction?.();
      }, 1200);
    } catch (cause) {
      console.error(cause);
      setToastMessage(toMessage(cause));
      setShowToast(true);
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
      setToastMessage('File too large. Max 6MB.');
      setShowToast(true);
      event.target.value = '';
      return;
    }
    try {
      setBusy(true);
      const url = await onUpload(file);
      if (url) {
        setUploadedAvatarUrl(url);
        setToastMessage('Avatar updated.');
        setShowToast(true);
        onAvatarChanged?.();
      }
    } catch (cause) {
      console.error(cause);
      setToastMessage(toMessage(cause));
      setShowToast(true);
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
  const presetUrls = AVATAR_PRESETS.map((preset) => preset.image_url);
  const resolvedForPreset =
    currentResolvedAvatarUrl ?? uploadedAvatarUrl ?? profile?.avatar ?? '';
  const selectedPresetUrl = presetUrls.includes(resolvedForPreset)
    ? resolvedForPreset
    : DEFAULT_AVATAR_URL;
  const handlePresetSelect = async (preset: {
    preset_id: string;
    name: string;
    image_url: string;
    description?: string;
  }) => {
    try {
      setBusy(true);
      await onUpdate({
        avatar: preset.image_url,
        use_weirdling_avatar: false,
      } as Partial<DashboardProfile>);
      setUploadedAvatarUrl(preset.image_url);
      setToastMessage('Avatar updated.');
      setShowToast(true);
      onAvatarChanged?.();
    } catch (cause) {
      console.error(cause);
      setToastMessage(toMessage(cause));
      setShowToast(true);
    } finally {
      setBusy(false);
    }
  };

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
        PaperProps={{ sx: GLASS_MODAL }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
            borderBottom: `1px solid ${BORDER_COLOR}`,
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
                  color: 'rgba(255,255,255,0.6)',
                  '&:hover': {
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </span>
          </Tooltip>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2, px: 3 }}>
          {busy && !uploadedAvatarUrl ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: PURPLE_ACCENT }} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <EditProfileBasicSection
                busy={busy}
                formData={formData}
                previewURL={previewURL}
                checkingHandle={checkingHandle}
                handleAvailable={handleAvailable}
                fileInputRef={fileInputRef}
                currentAvatar={currentAvatar}
                currentResolvedAvatarUrl={currentResolvedAvatarUrl}
                uploadedAvatarUrl={uploadedAvatarUrl}
                profile={profile}
                selectedPresetUrl={selectedPresetUrl}
                onFileChange={(e) => void handleFileChange(e)}
                onPresetSelect={(preset) => void handlePresetSelect(preset)}
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

              <EditProfileIndustrySection
                busy={busy}
                formData={formData}
                onChange={(updater) => setFormData((prev) => updater(prev))}
              />

              <EditProfileDetailsSection
                busy={busy}
                checkingHandle={checkingHandle}
                canSave={!busy && handleAvailable !== false && !checkingHandle}
                onManageLinks={
                  onManageLinks
                    ? () => handleRequestClose(onManageLinks)
                    : undefined
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
            </Stack>
          )}
        </DialogContent>

        <Snackbar
          open={showToast}
          autoHideDuration={4000}
          onClose={() => setShowToast(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #2c1e12 0%, #1a1a1a 100%)',
              border: '1px solid #d4af37',
              color: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
            }}
          >
            {toastMessage}
          </Box>
        </Snackbar>
      </Dialog>

      <Dialog
        open={unsavedConfirmOpen}
        onClose={() => setUnsavedConfirmOpen(false)}
        aria-labelledby="edit-profile-unsaved-title"
        aria-describedby="edit-profile-unsaved-desc"
      >
        <DialogTitle id="edit-profile-unsaved-title">
          Unsaved changes
        </DialogTitle>
        <DialogContent>
          <Typography id="edit-profile-unsaved-desc">
            You have unsaved profile changes. Save before closing?
          </Typography>
        </DialogContent>
        <DialogActions>
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

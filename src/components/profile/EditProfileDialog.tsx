import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { AvatarReplacementBox } from '../avatar/AvatarReplacementBox';
import { AVATAR_PRESETS, DEFAULT_AVATAR_URL } from '../../config/avatarPresets';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import type {
  DashboardProfile,
  IndustryGroup,
  NerdCreds,
} from '../../types/profile';

// Brand colors matching the screenshot
const GRADIENT_START = '#00C4CC'; // Blue-teal
const GRADIENT_END = '#FF22C9'; // Pink-purple
const AVATAR_GRADIENT = `linear-gradient(135deg, ${GRADIENT_START} 0%, ${GRADIENT_END} 100%)`;
const PURPLE_ACCENT = '#B366FF'; // Purple for headings
const DARK_BG = '#1a1a1f'; // Dark background
const INPUT_BG = '#28282d'; // Input background
const BORDER_COLOR = 'rgba(255,255,255,0.08)';

const GLASS_MODAL = {
  bgcolor: DARK_BG,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${BORDER_COLOR}`,
  color: 'white',
  borderRadius: 3,
  position: 'relative',
  overflow: 'visible',
  boxShadow: '0 24px 48px rgba(0,0,0,0.9)',
  maxWidth: '540px',
  width: '100%',
};

/** Consistent single-line input: 32px height, same padding on mobile & desktop */
const INPUT_HEIGHT = 32;
const INPUT_PADDING = '4px 12px';

/** Debounce handle availability check so we don't hit the DB on every keystroke (fixes typing lag). */
const HANDLE_CHECK_DEBOUNCE_MS = 400;

import {
  getSecondaryOptionsForPrimary,
  INDUSTRY_PRIMARY_OPTIONS,
} from '../../constants/industryTaxonomy';
import { validateIndustryGroups } from '../../lib/profile/validateIndustryGroups';

const INPUT_STYLES = {
  '& .MuiFilledInput-root': {
    bgcolor: INPUT_BG,
    borderRadius: '8px',
    border: `1px solid ${BORDER_COLOR}`,
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: INPUT_HEIGHT,
    '&:hover': {
      bgcolor: 'rgba(50, 50, 55, 0.9)',
      borderColor: 'rgba(255,255,255,0.12)',
    },
    '&.Mui-focused': {
      bgcolor: 'rgba(50, 50, 55, 0.95)',
      borderColor: PURPLE_ACCENT,
    },
    '&:before, &:after': { display: 'none' },
  },
  '& .MuiFilledInput-input': { padding: INPUT_PADDING },
  '& .MuiSelect-select': {
    padding: `${INPUT_PADDING} !important`,
    minHeight: 'unset !important',
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1.2,
    boxSizing: 'border-box',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
  },
  '& .MuiInputBase-input': {
    color: 'white',
    fontSize: '0.95rem',
  },
  /* Prevent ghosted/duplicate text in Select: hide the native input used for form value */
  '& input[aria-hidden="true"]': {
    opacity: 0,
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0,
    pointerEvents: 'none',
  },
  '& .MuiFormHelperText-root': {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    mt: 0.75,
    ml: 0,
  },
};

const getSubIndustryPlaceholder = (
  hasPrimaryIndustry: boolean,
  selectedCount: number,
): string => {
  if (!hasPrimaryIndustry) return 'Select an industry first';
  if (selectedCount > 0) return '';
  return 'Sub-Industry';
};

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  profile: DashboardProfile | null;
  hasWeirdling?: boolean;
  /** Fallback avatar URL (e.g. from OAuth provider) when profile has none */
  avatarFallback?: string | null;
  /** Resolved current avatar URL (for preset replacement box) */
  currentResolvedAvatarUrl?: string | null;
  onUpdate: (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => Promise<void>;
  onUpload: (file: File) => Promise<string | undefined>;
  /** Open links editor for profile/directory links */
  onManageLinks?: () => void;
  /** Called when avatar changes (e.g. preset selected) for reactive UI update */
  onAvatarChanged?: () => void;
  /** When true, focus or scroll to the Bio field when dialog opens (e.g. from "Add bio"). */
  focusBioOnOpen?: boolean;
};

const safeStr = (val: unknown, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  return fallback;
};

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
  const latestHandleRef = useRef<string>('');

  const [formData, setFormData] = useState({
    handle: '',
    pronouns: '',
    bio: '',
    skills: '',
    industries: [{ industry: '', sub_industries: [] }] as IndustryGroup[],
    niche_field: '',
    location: '',
    profile_visibility: 'members_only' as 'members_only' | 'connections_only',
  });

  const [busy, setBusy] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open || !focusBioOnOpen) return;
    const t = setTimeout(() => {
      const el = bioInputRef.current;
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
    return () => clearTimeout(t);
  }, [open, focusBioOnOpen]);

  useEffect(() => {
    if (open && profile) {
      if (handleCheckTimeoutRef.current != null) {
        clearTimeout(handleCheckTimeoutRef.current);
        handleCheckTimeoutRef.current = null;
      }
      const creds = (profile.nerd_creds as Record<string, unknown>) || {};

      const prof = profile as unknown as Record<string, unknown>;
      const handle = safeStr(profile.handle);
      latestHandleRef.current = handle;
      const rawIndustries = prof.industries as IndustryGroup[] | undefined;
      const industries: IndustryGroup[] =
        Array.isArray(rawIndustries) && rawIndustries.length > 0
          ? rawIndustries.map((g) => ({
              industry: typeof g?.industry === 'string' ? g.industry : '',
              sub_industries: Array.isArray(g?.sub_industries)
                ? (g.sub_industries as string[]).filter(
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

      setFormData({
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
          : 'members_only') as 'members_only' | 'connections_only',
      });
      setUploadedAvatarUrl(null);
    }
  }, [open, profile]);

  useEffect(() => {
    return () => {
      if (handleCheckTimeoutRef.current != null) {
        clearTimeout(handleCheckTimeoutRef.current);
        handleCheckTimeoutRef.current = null;
      }
    };
  }, []);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const checkHandle = async (val: string) => {
    if (val.length < 3) {
      setHandleAvailable(null);
      return;
    }
    if (!profile) return;

    if (val === profile.handle) {
      setHandleAvailable(true);
      return;
    }

    setCheckingHandle(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('handle')
        .eq('handle', val)
        .maybeSingle();

      if (latestHandleRef.current !== val) return;
      setHandleAvailable(!data);
    } finally {
      if (latestHandleRef.current === val) setCheckingHandle(false);
    }
  };

  const handleSave = async () => {
    if (handleAvailable === false || checkingHandle) {
      return;
    }

    const filled = formData.industries.filter((g) => g.industry?.trim());
    const validation = validateIndustryGroups(formData.industries);
    if (!validation.ok) {
      setToastMessage(validation.message);
      setShowToast(true);
      return;
    }
    const industriesToSave: IndustryGroup[] = filled.map((g) => ({
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

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (error) {
      console.error(error);
      setToastMessage(toMessage(error));
      setShowToast(true);
    } finally {
      setBusy(false);
    }
  };

  const MAX_AVATAR_BYTES = 6 * 1024 * 1024;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setToastMessage('File too large. Max 6MB.');
      setShowToast(true);
      e.target.value = '';
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
    } catch (error) {
      console.error(error);
      setToastMessage(toMessage(error));
      setShowToast(true);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const currentAvatar =
    uploadedAvatarUrl ||
    profile?.avatar ||
    avatarFallback ||
    DEFAULT_AVATAR_URL ||
    null;
  const previewURL = `http://localhost:5173/profile/${formData.handle}`;

  const presetUrls = AVATAR_PRESETS.map((p) => p.image_url);
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
    } catch (error) {
      console.error(error);
      setToastMessage(toMessage(error));
      setShowToast(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: GLASS_MODAL,
      }}
    >
      {/* Title Bar */}
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
              onClick={onClose}
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
            {/* Avatar Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={currentAvatar || undefined}
                  sx={{
                    width: 80,
                    height: 80,
                    background: currentAvatar ? 'transparent' : AVATAR_GRADIENT,
                    border: `3px solid transparent`,
                    backgroundImage: AVATAR_GRADIENT,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                />
                <Tooltip title="Change avatar">
                  <span>
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                      aria-label="Edit avatar"
                      sx={{
                        position: 'absolute',
                        bottom: 2,
                        right: 2,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        width: 24,
                        height: 24,
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.85)',
                        },
                      }}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </Box>
            </Box>

            {/* Avatar Replacement Box: preset Weirdling picker */}
            <AvatarReplacementBox
              currentAvatarUrl={
                currentResolvedAvatarUrl ??
                uploadedAvatarUrl ??
                profile?.avatar ??
                null
              }
              selectedPresetUrl={selectedPresetUrl}
              onSelectPreset={handlePresetSelect}
              disabled={busy}
            />

            {/* Handle */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  display: 'block',
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Handle
              </Typography>
              <TextField
                fullWidth
                value={formData.handle}
                disabled={busy || checkingHandle}
                variant="filled"
                placeholder="anickclark"
                sx={INPUT_STYLES}
                helperText={
                  formData.handle && previewURL
                    ? previewURL
                    : 'Your unique profile URL'
                }
                error={handleAvailable === false}
                onChange={(e) => {
                  const val = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '');
                  latestHandleRef.current = val;
                  setFormData((prev) => ({ ...prev, handle: val }));
                  if (handleCheckTimeoutRef.current != null) {
                    clearTimeout(handleCheckTimeoutRef.current);
                  }
                  if (val.length < 3) {
                    setHandleAvailable(null);
                    return;
                  }
                  handleCheckTimeoutRef.current = setTimeout(() => {
                    handleCheckTimeoutRef.current = null;
                    void checkHandle(val);
                  }, HANDLE_CHECK_DEBOUNCE_MS);
                }}
              />
            </Box>

            {/* Pronouns */}
            <Box>
              <FormControl
                fullWidth
                variant="filled"
                disabled={busy}
                sx={INPUT_STYLES}
              >
                <Select
                  value={formData.pronouns || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pronouns: e.target.value,
                    }))
                  }
                  displayEmpty
                  renderValue={(v) => v || 'Select pronouns'}
                  inputProps={{ 'aria-label': 'Pronouns' }}
                  sx={{
                    '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.6)' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: INPUT_BG,
                        color: 'white',
                        border: `1px solid ${BORDER_COLOR}`,
                      },
                    },
                  }}
                >
                  <MenuItem value="">Select pronouns</MenuItem>
                  <MenuItem value="She/Her">She/Her</MenuItem>
                  <MenuItem value="He/Him">He/Him</MenuItem>
                  <MenuItem value="They/Them">They/Them</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Industry groups (repeatable): Industry + Sub-Industry, max 5 groups, max 8 sub per group */}
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 1.25,
                  lineHeight: 1.2,
                }}
              >
                INDUSTRY
              </Typography>
              <Stack spacing={2.25}>
                {formData.industries.map((group, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      pl: { xs: 0, sm: 1 },
                      borderLeft: { sm: '2px solid rgba(255,255,255,0.1)' },
                      py: 0.5,
                    }}
                  >
                    <FormControl
                      fullWidth
                      disabled={busy}
                      variant="filled"
                      sx={{
                        ...INPUT_STYLES,
                        mb: idx === 0 ? 0 : 0.75,
                      }}
                    >
                      <Select
                        value={group.industry}
                        onChange={(e) => {
                          const next = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            industries: prev.industries.map((g, i) =>
                              i === idx
                                ? {
                                    industry: next,
                                    sub_industries: [],
                                  }
                                : g,
                            ),
                          }));
                        }}
                        displayEmpty
                        renderValue={(v) => v || 'Select industry'}
                        inputProps={{
                          'aria-label': 'Industry',
                        }}
                        sx={{
                          '& .MuiSelect-select': {
                            py: '8px !important',
                            lineHeight: 1.35,
                          },
                        }}
                      >
                        <MenuItem value="">Select industry</MenuItem>
                        {INDUSTRY_PRIMARY_OPTIONS.filter(
                          (opt) =>
                            opt === group.industry ||
                            !formData.industries.some(
                              (g, i) => i !== idx && g.industry === opt,
                            ),
                        ).map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {idx === 0 && (
                      <Stack
                        spacing={0.6}
                        sx={{ mt: 0.75, mb: 1.25, px: 0.25 }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: 'rgba(255,255,255,0.62)',
                            lineHeight: 1.45,
                          }}
                        >
                          Used for Directory filtering.
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: 'rgba(255,255,255,0.5)',
                            lineHeight: 1.45,
                          }}
                        >
                          Add up to 5 industries. Each can have up to 8
                          sub-industries.
                        </Typography>
                      </Stack>
                    )}
                    <Autocomplete
                      multiple
                      disabled={busy || !group.industry}
                      options={getSecondaryOptionsForPrimary(group.industry)}
                      value={group.sub_industries}
                      onChange={(_, next) => {
                        setFormData((prev) => ({
                          ...prev,
                          industries: prev.industries.map((g, i) =>
                            i === idx
                              ? { ...g, sub_industries: next.slice(0, 8) }
                              : g,
                          ),
                        }));
                      }}
                      getOptionLabel={(o) => o}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="filled"
                          inputProps={{
                            ...params.inputProps,
                            placeholder: getSubIndustryPlaceholder(
                              Boolean(group.industry),
                              group.sub_industries.length,
                            ),
                            'aria-label': 'Sub-Industry',
                          }}
                          sx={{
                            ...INPUT_STYLES,
                            '& .MuiFilledInput-root': {
                              ...INPUT_STYLES['& .MuiFilledInput-root'],
                              minHeight: INPUT_HEIGHT,
                              alignItems: 'center',
                            },
                            '& .MuiAutocomplete-input': {
                              lineHeight: 1.4,
                            },
                            '& .MuiAutocomplete-tag': {
                              my: '2px',
                            },
                          }}
                        />
                      )}
                      slotProps={{
                        paper: {
                          sx: {
                            bgcolor: INPUT_BG,
                            border: `1px solid ${BORDER_COLOR}`,
                          },
                        },
                      }}
                      sx={{ mb: 0.5 }}
                    />
                    {group.sub_industries.length > 8 ? (
                      <FormHelperText error>
                        Max 8 sub-industries. Remove{' '}
                        {group.sub_industries.length - 8} to save.
                      </FormHelperText>
                    ) : null}
                    {formData.industries.length > 1 && (
                      <Button
                        size="small"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            industries: prev.industries.filter(
                              (_, i) => i !== idx,
                            ),
                          }));
                        }}
                        sx={{ mt: 0.5, color: 'text.secondary' }}
                      >
                        Remove this industry
                      </Button>
                    )}
                  </Box>
                ))}
              </Stack>
              {formData.industries.length < 5 && (
                <Button
                  size="small"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      industries: [
                        ...prev.industries,
                        { industry: '', sub_industries: [] },
                      ],
                    }));
                  }}
                  sx={{ mt: 1, color: PURPLE_ACCENT, textTransform: 'none' }}
                >
                  Add Another Industry
                </Button>
              )}
              {formData.industries.length >= 5 && (
                <FormHelperText sx={{ mt: 0.5 }}>
                  Maximum 5 industries. Remove one to add another.
                </FormHelperText>
              )}
            </Box>

            {/* Niche or field */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                NICHE OR FIELD
              </Typography>
              <TextField
                fullWidth
                placeholder="Example: DevSecOps in FinTech"
                value={formData.niche_field}
                onChange={handleChange('niche_field')}
                disabled={busy}
                variant="filled"
                sx={INPUT_STYLES}
                helperText="Used for search. Not used for filters."
              />
            </Box>

            {/* Location */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                LOCATION
              </Typography>
              <TextField
                fullWidth
                placeholder="City, State"
                value={formData.location}
                onChange={handleChange('location')}
                disabled={busy}
                variant="filled"
                sx={INPUT_STYLES}
                helperText="Shown in Directory. E.g. San Francisco, CA."
              />
            </Box>

            {/* Profile visibility (Directory) */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                WHO SEES ME IN DIRECTORY
              </Typography>
              <FormControl
                fullWidth
                variant="filled"
                disabled={busy}
                sx={INPUT_STYLES}
              >
                <Select
                  value={formData.profile_visibility}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      profile_visibility: e.target.value as
                        | 'members_only'
                        | 'connections_only',
                    }))
                  }
                  sx={{
                    '& .MuiSelect-select': { padding: INPUT_PADDING },
                    '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.6)' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: INPUT_BG,
                        color: 'white',
                        border: `1px solid ${BORDER_COLOR}`,
                      },
                    },
                  }}
                >
                  <MenuItem value="members_only">
                    All signed-in members
                  </MenuItem>
                  <MenuItem value="connections_only">
                    Only my connections
                  </MenuItem>
                </Select>
              </FormControl>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Controls who can find you in the Directory.
              </Typography>
            </Box>

            {onManageLinks && (
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 2,
                    fontWeight: 'bold',
                    color: PURPLE_ACCENT,
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  DIRECTORY LINKS
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 1,
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  Add links shown on your profile and in Directory views.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    onClose();
                    onManageLinks();
                  }}
                  disabled={busy}
                  sx={{
                    textTransform: 'none',
                    borderColor: BORDER_COLOR,
                    color: 'white',
                    '&:hover': { borderColor: PURPLE_ACCENT },
                  }}
                >
                  Add or Edit Links
                </Button>
              </Box>
            )}

            {/* Skills */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                SKILLS
              </Typography>
              <TextField
                fullWidth
                placeholder="Skills (comma-separated)"
                value={formData.skills}
                onChange={handleChange('skills')}
                disabled={busy}
                variant="filled"
                sx={INPUT_STYLES}
                helperText="List skills or tags for your profile."
              />
            </Box>

            {/* Bio */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2,
                  fontWeight: 'bold',
                  color: PURPLE_ACCENT,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                BIO
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                maxRows={6}
                placeholder="Bio"
                value={formData.bio}
                onChange={handleChange('bio')}
                disabled={busy}
                variant="filled"
                inputRef={bioInputRef}
                sx={{
                  ...INPUT_STYLES,
                  '& .MuiFilledInput-root': {
                    minHeight: 'auto',
                    alignItems: 'flex-start',
                    paddingTop: '8px',
                  },
                  '& .MuiFilledInput-input': {
                    padding: INPUT_PADDING,
                  },
                }}
              />
            </Box>

            {/* Action Buttons */}
            <Stack
              direction="row"
              spacing={2}
              justifyContent="flex-end"
              sx={{ pt: 2 }}
            >
              <Button
                onClick={onClose}
                disabled={busy}
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={busy || handleAvailable === false || checkingHandle}
                startIcon={busy ? <CircularProgress size={16} /> : <SaveIcon />}
                sx={{
                  bgcolor: PURPLE_ACCENT,
                  color: 'white',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  px: 3,
                  '&:hover': {
                    bgcolor: GRADIENT_END,
                  },
                }}
              >
                {checkingHandle ? 'Checking...' : 'Save Changes'}
              </Button>
            </Stack>
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
  );
};

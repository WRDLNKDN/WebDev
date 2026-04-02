import CloseIcon from '@mui/icons-material/Close';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/auth/supabaseClient';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import {
  loadEligibleChatConnections,
  type EligibleChatConnection,
} from '../../../lib/chat/loadEligibleChatConnections';
import {
  CHAT_GROUP_DESCRIPTION_MAX,
  CHAT_GROUP_IMAGE_ACCEPT,
  type ChatGroupDetailsInput,
  uploadChatGroupImageAsset,
} from '../../../lib/chat/groupDetails';
import { toMessage } from '../../../lib/utils/errors';

type ProfileOption = EligibleChatConnection & {
  selected: boolean;
};

type LoadEligibleProfilesResult =
  | { status: 'success'; profiles: ProfileOption[] }
  | { status: 'error'; message: string }
  | { status: 'aborted' };

async function loadEligibleProfilesForGroup(
  userId: string,
  isCancelled: () => boolean,
): Promise<LoadEligibleProfilesResult> {
  try {
    const list = await loadEligibleChatConnections(userId);
    if (isCancelled()) return { status: 'aborted' };
    return {
      status: 'success',
      profiles: list
        .filter((profile) => profile.id !== userId)
        .map((profile) => ({ ...profile, selected: false })),
    };
  } catch {
    if (isCancelled()) return { status: 'aborted' };
    return {
      status: 'error',
      message: 'Could not load connections. Try again.',
    };
  }
}

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (
    details: ChatGroupDetailsInput,
    memberIds: string[],
  ) => Promise<void>;
  currentUserId?: string;
};

const MAX_MEMBERS = 99;
const CREATE_GROUP_FALLBACK_ERROR =
  "We couldn't create the group right now. Please try again.";

function formatCreateGroupSubmitError(cause: unknown): string {
  const message = toMessage(cause).trim();
  if (!message) return CREATE_GROUP_FALLBACK_ERROR;

  if (
    /schema cache|chat_rooms|column .* does not exist|relation .* does not exist|function .* does not exist/i.test(
      message,
    )
  ) {
    return CREATE_GROUP_FALLBACK_ERROR;
  }

  return message.length > 200 ? CREATE_GROUP_FALLBACK_ERROR : message;
}

function buildProfileSecondaryText(
  profile: EligibleChatConnection,
): string | null {
  const parts = [
    profile.handle ? `@${profile.handle}` : null,
    profile.email ?? null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : null;
}

export const CreateGroupDialog = ({
  open,
  onClose,
  onCreate,
  currentUserId,
}: CreateGroupDialogProps) => {
  const theme = useTheme();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setName('');
    setDescription('');
    setSearchQuery('');
    setPictureFile(null);
    setPicturePreviewUrl(null);
    setLoadingList(true);

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = currentUserId ?? session?.user?.id;
        if (!userId || cancelled) {
          setProfiles([]);
          return;
        }

        const result = await loadEligibleProfilesForGroup(
          userId,
          () => cancelled,
        );
        if (cancelled || result.status === 'aborted') return;
        if (result.status === 'error') {
          setError(result.message);
          setProfiles([]);
          return;
        }
        setProfiles(result.profiles);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      setLoadingList(false);
    };
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open) return;
    const focusHandle = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusHandle);
  }, [open]);

  useEffect(() => {
    if (!pictureFile) {
      setPicturePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(pictureFile);
    setPicturePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pictureFile]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((profile) => {
      const displayName = profile.display_name ?? '';
      const handle = profile.handle ?? '';
      const email = profile.email ?? '';
      return (
        displayName.toLowerCase().includes(q) ||
        handle.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q)
      );
    });
  }, [profiles, searchQuery]);

  const selectedCount = profiles.filter((profile) => profile.selected).length;
  const descriptionCount = description.length;
  const listSurfaceSx = {
    borderRadius: 2.75,
    border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.18 : 0.12)}`,
    bgcolor:
      theme.palette.mode === 'light'
        ? alpha(theme.palette.background.paper, 0.86)
        : 'linear-gradient(180deg, rgba(14,22,39,0.94) 0%, rgba(10,16,30,0.92) 100%)',
    boxShadow:
      theme.palette.mode === 'light'
        ? '0 14px 36px rgba(15,23,42,0.08)'
        : '0 20px 44px rgba(0,0,0,0.18)',
  };

  const toggle = (id: string) => {
    setError(null);
    setProfiles((prev) => {
      const next = prev.map((profile) =>
        profile.id === id
          ? { ...profile, selected: !profile.selected }
          : profile,
      );
      const count = next.filter((profile) => profile.selected).length;
      return count > MAX_MEMBERS ? prev : next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Enter a group name.');
      return;
    }

    const memberIds = profiles
      .filter((profile) => profile.selected)
      .map((p) => p.id);
    setSubmitting(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let imageUrl: string | null = null;
      if (pictureFile && session?.user?.id) {
        imageUrl = await uploadChatGroupImageAsset({
          file: pictureFile,
          currentUserId: session.user.id,
        });
      }

      await onCreate(
        {
          name: name.trim(),
          description,
          imageUrl,
        },
        memberIds,
      );
      onClose();
    } catch (cause) {
      console.warn('CreateGroupDialog submit failed:', cause);
      setError(formatCreateGroupSubmitError(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: 2.75, sm: 3.25 },
          border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.22 : 0.12)}`,
          background:
            theme.palette.mode === 'light'
              ? alpha(theme.palette.background.paper, 0.98)
              : 'linear-gradient(180deg, rgba(11,16,27,0.98) 0%, rgba(8,12,22,0.98) 100%)',
          boxShadow:
            theme.palette.mode === 'light'
              ? '0 30px 80px rgba(15,23,42,0.18)'
              : '0 36px 96px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        },
      }}
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreate();
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.4 }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h2"
                variant="h6"
                fontWeight={700}
                sx={{ letterSpacing: '-0.01em' }}
              >
                Create group
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.55, maxWidth: 420, lineHeight: 1.55 }}
              >
                Add your connections now, or invite more later from the group
                menu.
              </Typography>
            </Box>
            <Tooltip title="Close">
              <span>
                <IconButton
                  aria-label="Close"
                  onClick={onClose}
                  sx={{ color: alpha(theme.palette.text.primary, 0.78) }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: 0.5, pb: 2.5 }}>
          <Stack spacing={2.4}>
            {error ? (
              <Alert
                severity="error"
                variant="outlined"
                sx={{
                  borderRadius: 2.25,
                  alignItems: 'center',
                }}
              >
                {error}
              </Alert>
            ) : null}

            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: 'text.secondary',
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                }}
              >
                Group basics
              </Typography>
              <Stack spacing={1.35} sx={{ mt: 0.9 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.6 }}>
                    Group name
                  </Typography>
                  <TextField
                    fullWidth
                    inputRef={nameInputRef}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. Design team"
                    inputProps={{ 'aria-label': 'Group name' }}
                  />
                </Box>

                <Box>
                  <Stack
                    direction="row"
                    alignItems="baseline"
                    justifyContent="space-between"
                    spacing={2}
                    sx={{ mb: 0.6 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Description
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Optional. Give people context before they join.
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ flexShrink: 0 }}
                    >
                      {descriptionCount}/{CHAT_GROUP_DESCRIPTION_MAX}
                    </Typography>
                  </Stack>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    value={description}
                    onChange={(event) => {
                      setDescription(
                        event.target.value.slice(0, CHAT_GROUP_DESCRIPTION_MAX),
                      );
                      setError(null);
                    }}
                    placeholder="What is this group for?"
                    inputProps={{ 'aria-label': 'Group description' }}
                  />
                </Box>
              </Stack>
            </Box>

            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: 'text.secondary',
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                }}
              >
                Group picture
              </Typography>
              <Box sx={{ ...listSurfaceSx, mt: 0.9, px: 1.5, py: 1.5 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.6}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <ProfileAvatar
                    src={picturePreviewUrl}
                    alt={name.trim() || 'Group'}
                    size="small"
                    sx={{
                      width: 72,
                      height: 72,
                      flexShrink: 0,
                      border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.16 : 0.24)}`,
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <ImageOutlinedIcon
                        fontSize="small"
                        sx={{
                          color:
                            theme.palette.mode === 'light'
                              ? theme.palette.primary.main
                              : 'rgba(141,188,229,0.92)',
                        }}
                      />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Group picture
                      </Typography>
                      <Chip
                        size="small"
                        label="Optional"
                        sx={{
                          height: 22,
                          fontSize: '0.72rem',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.text.secondary,
                        }}
                      />
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.55, lineHeight: 1.5 }}
                    >
                      Add a square image so the group is easier to recognize at
                      a glance.
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.45 }}
                    >
                      PNG, JPG, or WebP. Square images work best.
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      sx={{ mt: 1.25 }}
                    >
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        {picturePreviewUrl
                          ? 'Replace picture'
                          : 'Upload picture'}
                      </Button>
                      {picturePreviewUrl ? (
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => {
                            setPictureFile(null);
                            setPicturePreviewUrl(null);
                            setError(null);
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </Stack>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept={CHAT_GROUP_IMAGE_ACCEPT}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (!file) return;
                        setPictureFile(file);
                        setError(null);
                        event.target.value = '';
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
            </Box>

            <Box>
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={2}
                sx={{ mb: 0.9 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: 'text.secondary',
                      letterSpacing: '0.14em',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                    }}
                  >
                    Invite members
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.35, lineHeight: 1.5 }}
                  >
                    Add connections now so the group is ready to chat.
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flexShrink: 0, mt: 0.2 }}
                >
                  {selectedCount}/{MAX_MEMBERS} selected
                </Typography>
              </Stack>

              {profiles.length > 0 ? (
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search connections by name, handle, or email..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  sx={{ mb: 1 }}
                  inputProps={{ 'aria-label': 'Search connections' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              ) : null}

              {loadingList ? (
                <Box sx={{ ...listSurfaceSx, px: 0.8, py: 0.8 }}>
                  <Stack spacing={0.75}>
                    <Skeleton variant="rounded" height={56} />
                    <Skeleton variant="rounded" height={56} />
                    <Skeleton variant="rounded" height={56} />
                  </Stack>
                </Box>
              ) : profiles.length === 0 ? (
                <Box sx={{ ...listSurfaceSx, px: 1.5, py: 1.45 }}>
                  <Stack direction="row" spacing={1.3} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2.2,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        color:
                          theme.palette.mode === 'light'
                            ? theme.palette.primary.main
                            : 'rgba(141,188,229,0.92)',
                        bgcolor:
                          theme.palette.mode === 'light'
                            ? alpha(theme.palette.primary.main, 0.12)
                            : 'rgba(56,132,210,0.16)',
                      }}
                    >
                      <GroupOutlinedIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        No eligible connections yet
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.45, lineHeight: 1.55 }}
                      >
                        Connect with members from the Directory or Feed first.
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ) : filteredProfiles.length === 0 ? (
                <Box sx={{ ...listSurfaceSx, px: 1.5, py: 1.35 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    No matches found
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.45, lineHeight: 1.55 }}
                  >
                    No connections match &quot;{searchQuery.trim()}&quot;.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    ...listSurfaceSx,
                    maxHeight: 284,
                    overflow: 'auto',
                    px: 0.65,
                    py: 0.65,
                  }}
                >
                  <List disablePadding>
                    {filteredProfiles.map((profile) => (
                      <ListItemButton
                        key={profile.id}
                        selected={profile.selected}
                        onClick={() => toggle(profile.id)}
                        sx={{
                          borderRadius: 2.25,
                          mb: 0.55,
                          px: 1,
                          py: 0.9,
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            profile.selected ? 0.34 : 0.08,
                          )}`,
                          bgcolor: profile.selected
                            ? alpha(theme.palette.primary.main, 0.12)
                            : 'transparent',
                          '&:last-of-type': { mb: 0 },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Checkbox
                            edge="start"
                            checked={profile.selected}
                            disabled={
                              !profile.selected && selectedCount >= MAX_MEMBERS
                            }
                          />
                        </ListItemIcon>
                        <ProfileAvatar
                          src={profile.avatar ?? undefined}
                          alt={profile.display_name ?? profile.handle}
                          size="small"
                          sx={{ mr: 1.5 }}
                        />
                        <ListItemText
                          primary={
                            profile.display_name || profile.handle || profile.id
                          }
                          secondary={buildProfileSecondaryText(profile)}
                          primaryTypographyProps={{
                            fontWeight: 600,
                            noWrap: true,
                          }}
                          secondaryTypographyProps={{
                            noWrap: true,
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.14 : 0.08)}`,
            bgcolor:
              theme.palette.mode === 'light'
                ? alpha(theme.palette.background.paper, 0.9)
                : 'rgba(10,15,26,0.92)',
          }}
        >
          <Button
            onClick={onClose}
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !name.trim()}
            sx={{
              textTransform: 'none',
              minWidth: 112,
              fontWeight: 700,
            }}
          >
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

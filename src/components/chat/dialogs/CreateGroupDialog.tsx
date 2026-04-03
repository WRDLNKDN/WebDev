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
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from 'react';
import { supabase } from '../../../lib/auth/supabaseClient';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import { MediaStatusBanner } from '../../media/MediaStatusBanner';
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
import type { SharedUploadState } from '../../../lib/media/uploadIntake';
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

function filterProfilesByQuery(
  profiles: ProfileOption[],
  searchQuery: string,
): ProfileOption[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return profiles;
  return profiles.filter((profile) => {
    const displayName = (profile.display_name ?? '').toLowerCase();
    const handle = (profile.handle ?? '').toLowerCase();
    return (
      displayName.includes(normalizedQuery) || handle.includes(normalizedQuery)
    );
  });
}

function toggleSelectedProfile(
  profiles: ProfileOption[],
  targetId: string,
): ProfileOption[] {
  const selectedCount = profiles.filter((profile) => profile.selected).length;
  return profiles.map((profile) => {
    if (profile.id !== targetId) return profile;
    if (!profile.selected && selectedCount >= MAX_MEMBERS) {
      return profile;
    }
    return { ...profile, selected: !profile.selected };
  });
}

type GroupPicturePickerProps = {
  groupName: string;
  picturePreviewUrl: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickPicture: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePicture: () => void;
};

const GroupPicturePicker = ({
  groupName,
  picturePreviewUrl,
  fileInputRef,
  onPickPicture,
  onRemovePicture,
}: GroupPicturePickerProps) => {
  return (
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <ProfileAvatar
        src={picturePreviewUrl}
        alt={groupName.trim() || 'Group'}
        size="small"
        sx={{ width: 64, height: 64 }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>
          Group picture
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Optional. PNG, JPG, or WebP. Square images work best.
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
          >
            {picturePreviewUrl ? 'Replace picture' : 'Upload picture'}
          </Button>
          {picturePreviewUrl ? (
            <Button color="inherit" onClick={onRemovePicture}>
              Remove
            </Button>
          ) : null}
        </Box>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={CHAT_GROUP_IMAGE_ACCEPT}
          onChange={onPickPicture}
        />
      </Box>
    </Box>
  );
};

type InviteMembersSectionProps = {
  loadingList: boolean;
  profiles: ProfileOption[];
  filteredProfiles: ProfileOption[];
  searchQuery: string;
  selectedCount: number;
  onSearchChange: (value: string) => void;
  onToggle: (id: string) => void;
};

const InviteMembersSection = ({
  loadingList,
  profiles,
  filteredProfiles,
  searchQuery,
  selectedCount,
  onSearchChange,
  onToggle,
}: InviteMembersSectionProps) => {
  if (profiles.length > 0) {
    return (
      <>
        <TextField
          fullWidth
          size="small"
          placeholder="Search connections by name or handle…"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
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
        {loadingList ? (
          <Typography variant="body2" color="text.secondary">
            Loading connections…
          </Typography>
        ) : filteredProfiles.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No connections match &quot;{searchQuery.trim()}&quot;.
          </Typography>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {filteredProfiles.map((profile) => (
              <ListItemButton
                key={profile.id}
                onClick={() => onToggle(profile.id)}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={profile.selected}
                    disabled={!profile.selected && selectedCount >= MAX_MEMBERS}
                  />
                </ListItemIcon>
                <ProfileAvatar
                  src={profile.avatar ?? undefined}
                  alt={profile.display_name ?? profile.handle}
                  size="small"
                  sx={{ mr: 1.5 }}
                />
                <ListItemText
                  primary={profile.display_name || profile.handle || profile.id}
                  secondary={profile.handle ? `@${profile.handle}` : null}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </>
    );
  }

  if (loadingList) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading connections…
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      No eligible connections yet. Connect with members from the Directory or
      Feed first.
    </Typography>
  );
};

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
  const [groupImageUploadState, setGroupImageUploadState] =
    useState<SharedUploadState | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setName('');
    setDescription('');
    setSearchQuery('');
    setPictureFile(null);
    setPicturePreviewUrl(null);
    setGroupImageUploadState(null);
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

  const filteredProfiles = filterProfilesByQuery(profiles, searchQuery);

  const toggle = (id: string) => {
    setProfiles((prev) => toggleSelectedProfile(prev, id));
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
    setGroupImageUploadState(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let imageUrl: string | null = null;
      if (pictureFile && session?.user?.id) {
        imageUrl = await uploadChatGroupImageAsset({
          file: pictureFile,
          currentUserId: session.user.id,
          onStateChange: setGroupImageUploadState,
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

  const selectedCount = profiles.filter((p) => p.selected).length;
  const descriptionCount = description.length;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleCreate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
        sx: {
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: {
            xs: 'calc(100dvh - 32px)',
            sm: 'calc(100dvh - 64px)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
          position: 'sticky',
          top: 0,
          zIndex: 1,
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        Create group
        <Tooltip title="Close">
          <span>
            <IconButton
              aria-label="Close"
              onClick={onClose}
              sx={{ color: 'rgba(255,255,255,0.75)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Add your connections now (you can invite more later via the ⋮ menu).
        </Typography>
        <TextField
          fullWidth
          inputRef={nameInputRef}
          label="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Design team"
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Description"
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value.slice(0, CHAT_GROUP_DESCRIPTION_MAX),
            )
          }
          helperText={`${descriptionCount}/${CHAT_GROUP_DESCRIPTION_MAX}`}
          sx={{ mb: 2 }}
        />
        <GroupPicturePicker
          groupName={name}
          picturePreviewUrl={picturePreviewUrl}
          fileInputRef={fileInputRef}
          onRemovePicture={() => {
            setPictureFile(null);
            setPicturePreviewUrl(null);
            setGroupImageUploadState(null);
          }}
          onPickPicture={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (!file) return;
            setPictureFile(file);
            setError(null);
            setGroupImageUploadState(null);
            event.target.value = '';
          }}
        />
        {groupImageUploadState ? (
          <MediaStatusBanner
            state={groupImageUploadState}
            compact
            sx={{ mb: 1.5 }}
          />
        ) : null}
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Invite members ({selectedCount}/{MAX_MEMBERS})
        </Typography>
        <InviteMembersSection
          loadingList={loadingList}
          profiles={profiles}
          filteredProfiles={filteredProfiles}
          searchQuery={searchQuery}
          selectedCount={selectedCount}
          onSearchChange={setSearchQuery}
          onToggle={toggle}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Press Enter to create the group.
        </Typography>
      </DialogContent>
      <DialogActions
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || !name.trim()}
        >
          {submitting ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Checkbox,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
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

export const CreateGroupDialog = ({
  open,
  onClose,
  onCreate,
  currentUserId,
}: CreateGroupDialogProps) => {
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

        const list = await loadEligibleChatConnections(userId);
        if (cancelled) return;
        setProfiles(
          list
            .filter((profile) => profile.id !== userId)
            .map((profile) => ({
              ...profile,
              selected: false,
            })),
        );
      } catch {
        if (!cancelled) {
          setError('Could not load connections. Try again.');
          setProfiles([]);
        }
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

  const filteredProfiles = profiles.filter((profile) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (profile.display_name ?? '').toLowerCase().includes(q) ||
      (profile.handle ?? '').toLowerCase().includes(q)
    );
  });

  const toggle = (id: string) => {
    setProfiles((prev) => {
      const opts = prev.map((p) =>
        p.id === id ? { ...p, selected: !p.selected } : p,
      );
      const count = opts.filter((o) => o.selected).length;
      if (count >= MAX_MEMBERS) {
        return prev.map((p) =>
          p.id === id && !p.selected
            ? p
            : p.id === id
              ? { ...p, selected: false }
              : p,
        );
      }
      return opts;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Enter a group name');
      return;
    }
    const memberIds = profiles.filter((p) => p.selected).map((p) => p.id);
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
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = profiles.filter((p) => p.selected).length;
  const descriptionCount = description.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreate();
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
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
        <DialogContent>
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
              alt={name.trim() || 'Group'}
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
                  <Button
                    color="inherit"
                    onClick={() => {
                      setPictureFile(null);
                      setPicturePreviewUrl(null);
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </Box>
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
          </Box>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {error}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Invite members ({selectedCount}/{MAX_MEMBERS})
          </Typography>
          {profiles.length > 0 && (
            <TextField
              fullWidth
              size="small"
              placeholder="Search connections by name or handle…"
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
          )}
          {loadingList ? (
            <Typography variant="body2" color="text.secondary">
              Loading connections…
            </Typography>
          ) : profiles.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No eligible connections yet. Connect with members from the
              Directory or Feed first.
            </Typography>
          ) : filteredProfiles.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No connections match &quot;{searchQuery.trim()}&quot;.
            </Typography>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {filteredProfiles.map((p) => (
                <ListItemButton key={p.id} onClick={() => toggle(p.id)}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={p.selected}
                      disabled={!p.selected && selectedCount >= MAX_MEMBERS}
                    />
                  </ListItemIcon>
                  <ProfileAvatar
                    src={p.avatar ?? undefined}
                    alt={p.display_name ?? p.handle}
                    size="small"
                    sx={{ mr: 1.5 }}
                  />
                  <ListItemText
                    primary={p.display_name || p.handle || p.id}
                    secondary={p.handle ? `@${p.handle}` : null}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Press Enter to create the group.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

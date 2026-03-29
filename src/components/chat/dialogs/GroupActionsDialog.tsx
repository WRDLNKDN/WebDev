import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import {
  CHAT_GROUP_DESCRIPTION_MAX,
  CHAT_GROUP_IMAGE_ACCEPT,
  type ChatGroupDetailsInput,
  uploadChatGroupImageAsset,
} from '../../../lib/chat/groupDetails';
import {
  loadEligibleChatConnections,
  type EligibleChatConnection,
} from '../../../lib/chat/loadEligibleChatConnections';
import { toMessage } from '../../../lib/utils/errors';

type Mode = 'invite' | 'details' | 'manage' | 'members';

type GroupActionsDialogProps = {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  roomId?: string;
  roomName: string;
  roomDescription?: string | null;
  roomImageUrl?: string | null;
  currentMembers: Array<{
    user_id: string;
    role: string;
    profile: {
      handle: string;
      display_name: string | null;
      avatar?: string | null;
    } | null;
  }>;
  currentUserId: string;
  onSaveDetails: (details: ChatGroupDetailsInput) => Promise<void>;
  onInvite: (ids: string[]) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onTransferAdmin: (userId: string) => Promise<void>;
};

export const GroupActionsDialog = ({
  open,
  mode,
  onClose,
  roomName,
  roomDescription,
  roomImageUrl,
  currentMembers,
  currentUserId,
  onSaveDetails,
  onInvite,
  onRemove,
  onTransferAdmin,
}: GroupActionsDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(roomName);
  const [description, setDescription] = useState(roomDescription ?? '');
  const [allProfiles, setAllProfiles] = useState<EligibleChatConnection[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState<string | null>(
    null,
  );
  const [pictureRemoved, setPictureRemoved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(roomName);
    setDescription(roomDescription ?? '');
    setSelected(new Set());
    setBusy(false);
    setError(null);
    setPictureFile(null);
    setPictureRemoved(false);
    setPicturePreviewUrl(null);

    if (mode !== 'invite') {
      setAllProfiles([]);
      setLoadingProfiles(false);
      return;
    }

    let cancelled = false;
    const memberIds = new Set(currentMembers.map((m) => m.user_id));
    setLoadingProfiles(true);
    void (async () => {
      try {
        const profiles = await loadEligibleChatConnections(currentUserId);
        if (cancelled) return;
        setAllProfiles(
          profiles.filter(
            (profile) =>
              profile.id !== currentUserId && !memberIds.has(profile.id),
          ),
        );
      } catch {
        if (!cancelled) {
          setError('Could not load eligible members. Try again.');
          setAllProfiles([]);
        }
      } finally {
        if (!cancelled) setLoadingProfiles(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentMembers, currentUserId, mode, open, roomDescription, roomName]);

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

  const resolvedPictureUrl = pictureRemoved
    ? null
    : (picturePreviewUrl ?? roomImageUrl ?? null);
  const descriptionCount = description.length;
  const memberCount = currentMembers.length;
  const visibleMembers = useMemo(
    () =>
      [...currentMembers].sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        const aLabel =
          a.profile?.display_name || a.profile?.handle || a.user_id;
        const bLabel =
          b.profile?.display_name || b.profile?.handle || b.user_id;
        return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
      }),
    [currentMembers],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleChoosePicture = () => {
    fileInputRef.current?.click();
  };

  const handlePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setError(null);
    setPictureFile(file);
    setPictureRemoved(false);
    event.target.value = '';
  };

  const handleRemovePicture = () => {
    setPictureFile(null);
    setPictureRemoved(true);
    setPicturePreviewUrl(null);
  };

  const handleSaveDetails = async () => {
    if (!name.trim()) {
      setError('Enter a group name.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let imageUrl = pictureRemoved ? null : (roomImageUrl ?? null);
      if (pictureFile) {
        imageUrl = await uploadChatGroupImageAsset({
          file: pictureFile,
          currentUserId,
        });
      }

      await onSaveDetails({
        name: name.trim(),
        description,
        imageUrl,
      });
      onClose();
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    setBusy(true);
    setError(null);
    try {
      await onInvite(Array.from(selected));
      onClose();
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'invite' && 'Invite members'}
        {mode === 'details' && 'Edit group details'}
        {mode === 'manage' && 'Manage members'}
        {mode === 'members' && 'Group members'}
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
            {error}
          </Typography>
        ) : null}

        {mode === 'details' ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <ProfileAvatar
                src={resolvedPictureUrl}
                alt={name.trim() || roomName || 'Group'}
                size="small"
                sx={{ width: 72, height: 72 }}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" onClick={handleChoosePicture}>
                  {resolvedPictureUrl ? 'Replace picture' : 'Upload picture'}
                </Button>
                {(resolvedPictureUrl || pictureFile) && (
                  <Button color="inherit" onClick={handleRemovePicture}>
                    Remove
                  </Button>
                )}
              </Stack>
              <input
                ref={fileInputRef}
                type="file"
                accept={CHAT_GROUP_IMAGE_ACCEPT}
                hidden
                onChange={handlePictureChange}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              PNG, JPG, or WebP. Square images work best.
            </Typography>
            <TextField
              fullWidth
              label="Group name"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
            />
          </Stack>
        ) : null}

        {mode === 'invite' ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Add members ({memberCount}/100)
            </Typography>
            {loadingProfiles ? (
              <Typography variant="body2" color="text.secondary">
                Loading eligible members…
              </Typography>
            ) : allProfiles.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No eligible connections are available to invite right now.
              </Typography>
            ) : (
              <List sx={{ maxHeight: 320, overflow: 'auto' }}>
                {allProfiles.map((profile) => (
                  <ListItemButton
                    key={profile.id}
                    onClick={() => toggle(profile.id)}
                  >
                    <ListItemIcon>
                      <Checkbox checked={selected.has(profile.id)} />
                    </ListItemIcon>
                    <ProfileAvatar
                      src={profile.avatar}
                      alt={profile.display_name || profile.handle || 'Member'}
                      size="small"
                      sx={{ width: 36, height: 36, mr: 1.25 }}
                    />
                    <ListItemText
                      primary={
                        profile.display_name || profile.handle || profile.id
                      }
                      secondary={profile.handle ? `@${profile.handle}` : null}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </>
        ) : null}

        {mode === 'members' || mode === 'manage' ? (
          <List sx={{ maxHeight: 360, overflow: 'auto' }}>
            {visibleMembers.map((member) => {
              const label =
                member.profile?.display_name ||
                member.profile?.handle ||
                member.user_id;
              const secondaryParts = [
                member.profile?.handle ? `@${member.profile.handle}` : null,
                member.role === 'admin' ? 'Admin' : 'Member',
              ].filter(Boolean);

              return (
                <ListItemButton
                  key={member.user_id}
                  disabled={mode === 'members'}
                  sx={{
                    alignItems: 'center',
                    cursor: mode === 'members' ? 'default' : 'pointer',
                  }}
                >
                  <ProfileAvatar
                    src={member.profile?.avatar}
                    alt={label}
                    size="small"
                    sx={{ width: 36, height: 36, mr: 1.25 }}
                  />
                  <ListItemText
                    primary={label}
                    secondary={secondaryParts.join(' • ')}
                  />
                  {mode === 'manage' && member.user_id !== currentUserId ? (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        onClick={() => void onRemove(member.user_id)}
                        color="error"
                      >
                        Remove
                      </Button>
                      {member.role === 'member' && (
                        <Button
                          size="small"
                          onClick={() => void onTransferAdmin(member.user_id)}
                        >
                          Make admin
                        </Button>
                      )}
                    </Stack>
                  ) : null}
                </ListItemButton>
              );
            })}
          </List>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {mode === 'details' ? (
          <Button
            onClick={() => void handleSaveDetails()}
            disabled={busy || !name.trim()}
          >
            Save
          </Button>
        ) : null}
        {mode === 'invite' ? (
          <Button
            onClick={() => void handleInvite()}
            disabled={busy || selected.size === 0}
          >
            Invite
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

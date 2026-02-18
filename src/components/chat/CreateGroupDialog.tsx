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
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';

type ProfileOption = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar: string | null;
  selected: boolean;
};

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => Promise<void>;
  currentUserId?: string;
};

const MAX_MEMBERS = 99;

export const CreateGroupDialog = ({
  open,
  onClose,
  onCreate,
  currentUserId,
}: CreateGroupDialogProps) => {
  const [name, setName] = useState('');
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setName('');

    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar')
        .eq('status', 'approved')
        .limit(200);

      if (cancelled) return;
      const list = (data ?? []).filter(
        (p) => !currentUserId || p.id !== currentUserId,
      );
      setProfiles(
        list.map((p) => ({
          ...p,
          selected: false,
        })) as ProfileOption[],
      );
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, currentUserId]);

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
      await onCreate(name.trim(), memberIds);
      onClose();
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof (e as { message?: string })?.message === 'string'
            ? (e as { message: string }).message
            : 'Could not create group';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = profiles.filter((p) => p.selected).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create group</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Add members now (you can invite more later via the ⋮ menu).
        </Typography>
        <TextField
          fullWidth
          label="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Design team"
          sx={{ mt: 1, mb: 2 }}
        />
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Invite members ({selectedCount}/{MAX_MEMBERS})
        </Typography>
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {profiles.map((p) => (
            <ListItemButton key={p.id} onClick={() => toggle(p.id)}>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={p.selected}
                  disabled={!p.selected && selectedCount >= MAX_MEMBERS}
                />
              </ListItemIcon>
              <ListItemText
                primary={p.display_name || p.handle || p.id}
                secondary={p.handle ? `@${p.handle}` : null}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void handleCreate()}
          disabled={submitting || !name.trim()}
        >
          {submitting ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

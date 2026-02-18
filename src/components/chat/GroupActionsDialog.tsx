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

type Mode = 'invite' | 'rename' | 'manage';

type GroupActionsDialogProps = {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  roomId?: string;
  roomName: string;
  currentMembers: Array<{
    user_id: string;
    role: string;
    profile: { handle: string; display_name: string | null } | null;
  }>;
  currentUserId: string;
  onRename: (name: string) => Promise<void>;
  onInvite: (ids: string[]) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onTransferAdmin: (userId: string) => Promise<void>;
};

export const GroupActionsDialog = ({
  open,
  mode,
  onClose,
  roomName,
  currentMembers,
  currentUserId,
  onRename,
  onInvite,
  onRemove,
  onTransferAdmin,
}: GroupActionsDialogProps) => {
  const [name, setName] = useState(roomName);
  const [allProfiles, setAllProfiles] = useState<
    Array<{ id: string; handle: string; display_name: string | null }>
  >([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(roomName);
    setSelected(new Set());

    if (mode === 'invite') {
      const memberIds = new Set(currentMembers.map((m) => m.user_id));
      supabase
        .from('profiles')
        .select('id, handle, display_name')
        .eq('status', 'approved')
        .limit(200)
        .then(({ data }) => {
          setAllProfiles(
            (data ?? []).filter(
              (p) => !memberIds.has(p.id),
            ) as typeof allProfiles,
          );
        });
    }
  }, [open, mode, roomName, currentMembers]);

  const handleRename = async () => {
    setBusy(true);
    try {
      await onRename(name.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    setBusy(true);
    try {
      await onInvite(Array.from(selected));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const memberCount = currentMembers.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'invite' && 'Invite members'}
        {mode === 'rename' && 'Rename group'}
        {mode === 'manage' && 'Manage members'}
      </DialogTitle>
      <DialogContent>
        {mode === 'rename' && (
          <TextField
            fullWidth
            label="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 1 }}
          />
        )}
        {mode === 'invite' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Add members ({memberCount}/100)
            </Typography>
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {allProfiles.map((p) => (
                <ListItemButton key={p.id} onClick={() => toggle(p.id)}>
                  <ListItemIcon>
                    <Checkbox checked={selected.has(p.id)} />
                  </ListItemIcon>
                  <ListItemText
                    primary={p.display_name || p.handle || p.id}
                    secondary={p.handle ? `@${p.handle}` : null}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
        {mode === 'manage' && (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {currentMembers
              .filter((m) => m.user_id !== currentUserId)
              .map((m) => (
                <ListItemButton key={m.user_id}>
                  <ListItemText
                    primary={
                      m.profile?.display_name || m.profile?.handle || m.user_id
                    }
                    secondary={m.role === 'admin' ? 'Admin' : null}
                  />
                  <Button
                    size="small"
                    onClick={() => void onRemove(m.user_id)}
                    color="error"
                  >
                    Remove
                  </Button>
                  {m.role === 'member' && (
                    <Button
                      size="small"
                      onClick={() => void onTransferAdmin(m.user_id)}
                      sx={{ ml: 1 }}
                    >
                      Make admin
                    </Button>
                  )}
                </ListItemButton>
              ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {mode === 'rename' && (
          <Button
            onClick={() => void handleRename()}
            disabled={busy || !name.trim()}
          >
            Save
          </Button>
        )}
        {mode === 'invite' && (
          <Button
            onClick={() => void handleInvite()}
            disabled={busy || selected.size === 0}
          >
            Invite
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

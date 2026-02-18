import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';

type ConnectionProfile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar: string | null;
};

type StartDmDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (userId: string) => Promise<void>;
};

export const StartDmDialog = ({
  open,
  onClose,
  onSelect,
}: StartDmDialogProps) => {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;

      const { data: myConns } = await supabase
        .from('feed_connections')
        .select('connected_user_id')
        .eq('user_id', session.user.id);

      if (!myConns?.length || cancelled) {
        setConnections([]);
        return;
      }

      const connIds = myConns.map((c) => c.connected_user_id);

      const { data: mutualConns } = await supabase
        .from('feed_connections')
        .select('user_id')
        .eq('connected_user_id', session.user.id)
        .in('user_id', connIds);

      const mutualIds = new Set((mutualConns ?? []).map((m) => m.user_id));

      const { data: blocks } = await supabase
        .from('chat_blocks')
        .select('blocker_id, blocked_user_id')
        .or(
          `blocker_id.eq.${session.user.id},blocked_user_id.eq.${session.user.id}`,
        );

      const blockedSet = new Set<string>();
      (blocks ?? []).forEach((b) => {
        if (b.blocker_id === session.user.id) blockedSet.add(b.blocked_user_id);
        else blockedSet.add(b.blocker_id);
      });

      const allowedIds = Array.from(mutualIds).filter(
        (id) => !blockedSet.has(id),
      );

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar')
        .in('id', allowedIds);

      if (cancelled) return;

      setConnections((profileData ?? []) as ConnectionProfile[]);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSelect = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onSelect(userId);
      onClose();
    } catch {
      setError('Could not start a chat with this member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Start a chat</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Only your connections can receive 1:1 messages.
        </Typography>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <List>
          {connections.map((c) => (
            <ListItemButton
              key={c.id}
              onClick={() => void handleSelect(c.id)}
              disabled={loading}
            >
              <Typography variant="body2">
                {c.display_name || c.handle || c.id}
              </Typography>
              {c.handle && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  @{c.handle}
                </Typography>
              )}
            </ListItemButton>
          ))}
        </List>
        {connections.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary">
            No connections yet. Connect with people from the Directory or Feed.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

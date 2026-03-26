import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/auth/supabaseClient';

type ConnectionProfile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar: string | null;
  email?: string | null;
};

type StartDmDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (userId: string) => Promise<void>;
  /** Shown when starting the chat failed (e.g. createDm failed). */
  startError?: string | null;
};

export const StartDmDialog = ({
  open,
  onClose,
  onSelect,
  startError,
}: StartDmDialogProps) => {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const q = searchQuery.trim().toLowerCase();
    return connections.filter(
      (c) =>
        (c.display_name ?? '').toLowerCase().includes(q) ||
        (c.handle ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [connections, searchQuery]);

  useEffect(() => {
    if (!open) return;
    setSearchQuery('');
    setError(null);
    let cancelled = false;
    setLoadingList(true);

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user || cancelled) {
          setConnections([]);
          return;
        }

        const { data: myConns, error: connErr } = await supabase
          .from('feed_connections')
          .select('connected_user_id')
          .eq('user_id', session.user.id);

        if (cancelled) return;
        if (connErr) {
          setError('Could not load connections. Try again.');
          setConnections([]);
          return;
        }
        if (!myConns?.length) {
          setConnections([]);
          return;
        }

        const connIds = myConns.map((c) => c.connected_user_id);

        const { data: mutualConns, error: mutualErr } = await supabase
          .from('feed_connections')
          .select('user_id')
          .eq('connected_user_id', session.user.id)
          .in('user_id', connIds);

        if (cancelled) return;
        if (mutualErr) {
          setError('Could not load connections. Try again.');
          setConnections([]);
          return;
        }

        const mutualIds = new Set((mutualConns ?? []).map((m) => m.user_id));

        const { data: blocks } = await supabase
          .from('chat_blocks')
          .select('blocker_id, blocked_user_id')
          .or(
            `blocker_id.eq.${session.user.id},blocked_user_id.eq.${session.user.id}`,
          );

        const blockedSet = new Set<string>();
        (blocks ?? []).forEach((b) => {
          if (b.blocker_id === session.user.id)
            blockedSet.add(b.blocked_user_id);
          else blockedSet.add(b.blocker_id);
        });

        const allowedIds = Array.from(mutualIds).filter(
          (id) => !blockedSet.has(id),
        );

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, handle, display_name, avatar, email')
          .in('id', allowedIds);

        if (cancelled) return;

        setConnections((profileData ?? []) as ConnectionProfile[]);
      } catch {
        if (!cancelled) {
          setError('Could not load connections. Try again.');
          setConnections([]);
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
  }, [open]);

  useEffect(() => {
    if (!open || connections.length === 0) return;
    const focusHandle = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusHandle);
  }, [connections.length, open]);

  const handleSelect = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onSelect(userId);
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof (e as { message?: string })?.message === 'string'
            ? (e as { message: string }).message
            : "We couldn't start a chat with this member. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
        }}
      >
        Start a chat
        <Tooltip title="Close">
          <IconButton
            aria-label="Close"
            onClick={onClose}
            sx={{ color: 'rgba(255,255,255,0.75)' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Only your connections can receive 1:1 messages.
        </Typography>
        {(error || startError) && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error || startError}
          </Typography>
        )}
        {connections.length > 0 && (
          <TextField
            fullWidth
            size="small"
            inputRef={searchInputRef}
            placeholder="Search connections by name, handle, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || loading) return;
              const firstMatch = filteredConnections[0];
              if (!firstMatch) return;
              event.preventDefault();
              void handleSelect(firstMatch.id);
            }}
            sx={{
              mb: 1,
              '& .MuiInputBase-root': {
                minHeight: 44,
                height: 44,
                alignItems: 'center',
              },
            }}
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
        ) : (
          <List dense disablePadding>
            {filteredConnections.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => void handleSelect(c.id)}
                disabled={loading}
                sx={{ py: 0.75 }}
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
        )}
        {!loadingList && connections.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No connections yet. Connect with people from the Directory or Feed.
          </Typography>
        )}
        {!loadingList &&
          connections.length > 0 &&
          filteredConnections.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No connections match &quot;{searchQuery.trim()}&quot;.
            </Typography>
          )}
        {!loadingList && filteredConnections.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Press Enter to start a chat with the first result.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

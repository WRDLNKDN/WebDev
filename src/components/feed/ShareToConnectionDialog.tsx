/**
 * Share a Feed post to one or more Connections. Opens connection selector,
 * allows optional message; sends post link (and message) to each connection's Chat.
 */

import SearchIcon from '@mui/icons-material/Search';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  buildSharedPostChatContent,
  insertSharedPostChatMessage,
} from '../../lib/feed/sharePostToChat';
import { SharePostOptionalMessageField } from './SharePostOptionalMessageField';
import {
  loadEligibleChatConnections,
  type EligibleChatConnection,
} from '../../lib/chat/loadEligibleChatConnections';
import { ProfileAvatar } from '../avatar/ProfileAvatar';

type ConnectionProfile = EligibleChatConnection;

export type ShareToConnectionDialogProps = {
  open: boolean;
  onClose: () => void;
  postUrl: string;
  /** Create or get DM room for the given user id; returns room id. */
  createDm: (userId: string) => Promise<string | null>;
  onSent: () => void;
  onError: (message: string) => void;
};

export const ShareToConnectionDialog = ({
  open,
  onClose,
  postUrl,
  createDm,
  onSent,
  onError,
}: ShareToConnectionDialogProps) => {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [optionalMessage, setOptionalMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
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
    setSelectedIds(new Set());
    setOptionalMessage('');
    setError(null);
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user || cancelled) {
          setConnections([]);
          return;
        }

        const list = await loadEligibleChatConnections(session.user.id);
        if (cancelled) return;
        setConnections(list);
      } catch {
        if (!cancelled) {
          setError('Could not load connections. Try again.');
          setConnections([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || connections.length === 0) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, connections.length]);

  const toggle = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      onError('Please sign in to share.');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setError('Select at least one connection.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      const content = buildSharedPostChatContent(
        optionalMessage.trim(),
        postUrl,
      );

      for (const userId of ids) {
        const roomId = await createDm(userId);
        if (!roomId) continue;
        await insertSharedPostChatMessage({
          roomId,
          senderId: session.user.id,
          content,
        });
      }
      onSent();
      onClose();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Could not share. Please try again.';
      setError(msg);
      onError(msg);
    } finally {
      setSending(false);
    }
  }, [
    selectedIds,
    optionalMessage,
    postUrl,
    createDm,
    onSent,
    onClose,
    onError,
  ]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share to Connection</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Choose one or more connections. The post link will be sent in Chat.
        </Typography>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading connections…
          </Typography>
        ) : connections.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No eligible connections yet. Connect with members from the Directory
            or Feed first — the same mutual connections you can chat with appear
            here.
          </Typography>
        ) : (
          <>
            <TextField
              fullWidth
              size="small"
              inputRef={searchRef}
              placeholder="Search by name, handle, or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                ),
              }}
              sx={{ mb: 1 }}
              aria-label="Search connections"
            />
            <List dense sx={{ maxHeight: 220, overflow: 'auto' }}>
              {filtered.map((c) => (
                <ListItemButton
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  selected={selectedIds.has(c.id)}
                >
                  <Checkbox
                    size="small"
                    checked={selectedIds.has(c.id)}
                    sx={{ mr: 1 }}
                    tabIndex={-1}
                  />
                  <ProfileAvatar
                    src={c.avatar ?? undefined}
                    alt={c.display_name ?? c.handle}
                    size="small"
                    sx={{ mr: 1.5 }}
                  />
                  <Typography variant="body2">
                    {c.display_name || c.handle || c.id}
                  </Typography>
                  {c.display_name && c.handle && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 0.5 }}
                    >
                      @{c.handle}
                    </Typography>
                  )}
                </ListItemButton>
              ))}
            </List>
            <SharePostOptionalMessageField
              value={optionalMessage}
              onChange={setOptionalMessage}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<SendOutlinedIcon />}
          onClick={() => void handleSend()}
          disabled={
            loading ||
            sending ||
            selectedIds.size === 0 ||
            connections.length === 0
          }
        >
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

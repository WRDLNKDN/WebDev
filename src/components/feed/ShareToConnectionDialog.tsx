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
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  buildSharedPostChatContent,
  insertSharedPostChatMessage,
} from '../../lib/feed/sharePostToChat';
import { SharePostOptionalMessageField } from './SharePostOptionalMessageField';
import { useEligibleChatConnectionPicker } from '../../lib/chat/useEligibleChatConnectionPicker';
import { ProfileAvatar } from '../avatar/ProfileAvatar';

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
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [optionalMessage, setOptionalMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const {
    connections,
    filteredConnections,
    loadingConnections,
    loadError,
    searchInputRef,
    searchQuery,
    setSearchQuery,
  } = useEligibleChatConnectionPicker(open);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setOptionalMessage('');
    setError(null);
  }, [open]);

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
        {(error || loadError) && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error || loadError}
          </Typography>
        )}
        {loadingConnections ? (
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
              inputRef={searchInputRef}
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
              {filteredConnections.map((c) => (
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
            loadingConnections ||
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

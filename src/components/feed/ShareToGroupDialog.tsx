/**
 * Share a Feed post to a Group the user belongs to. Single group selection,
 * optional message; sends post link (and message) to the group Chat.
 */

import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
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
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  buildSharedPostChatContent,
  insertSharedPostChatMessage,
} from '../../lib/feed/sharePostToChat';
import { SharePostOptionalMessageField } from './SharePostOptionalMessageField';
import type { ChatRoomWithMembers } from '../../hooks/chatTypes';

export type ShareToGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  postUrl: string;
  /** Group rooms the current user is a member of. */
  groupRooms: ChatRoomWithMembers[];
  onSent: () => void;
  onError: (message: string) => void;
};

export const ShareToGroupDialog = ({
  open,
  onClose,
  postUrl,
  groupRooms,
  onSent,
  onError,
}: ShareToGroupDialogProps) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [optionalMessage, setOptionalMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedRoomId(null);
      setOptionalMessage('');
      setError(null);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    if (!selectedRoomId) {
      setError('Select a group.');
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      onError('Please sign in to share.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      const content = buildSharedPostChatContent(
        optionalMessage.trim(),
        postUrl,
      );

      await insertSharedPostChatMessage({
        roomId: selectedRoomId,
        senderId: session.user.id,
        content,
      });
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
  }, [selectedRoomId, optionalMessage, postUrl, onSent, onClose, onError]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share to Group</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Choose a group you belong to. The post link will be shared in that
          group chat.
        </Typography>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        {groupRooms.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            You are not in any groups yet. Create or join a group from Chat.
          </Typography>
        ) : (
          <>
            <List dense sx={{ maxHeight: 220, overflow: 'auto' }}>
              {groupRooms.map((room) => (
                <ListItemButton
                  key={room.id}
                  selected={selectedRoomId === room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <GroupOutlinedIcon
                    sx={{ color: 'text.secondary', mr: 1.5, fontSize: 20 }}
                  />
                  <Typography variant="body2">
                    {room.name || 'Unnamed group'}
                  </Typography>
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
          disabled={sending || !selectedRoomId || groupRooms.length === 0}
        >
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

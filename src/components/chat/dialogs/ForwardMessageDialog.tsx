import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import { getChatRoomLabel } from '../../../lib/chat/roomListState';

type ForwardMessageDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Rooms the member can forward into (typically same list as sidebar). */
  rooms: ChatRoomWithMembers[];
  /** Hide the active conversation from the list. */
  excludeRoomId: string;
  currentUserId: string;
  onSelectRoom: (targetRoomId: string) => Promise<void>;
  busy?: boolean;
};

export const ForwardMessageDialog = ({
  open,
  onClose,
  rooms,
  excludeRoomId,
  currentUserId,
  onSelectRoom,
  busy = false,
}: ForwardMessageDialogProps) => {
  const choices = rooms.filter((r) => r.id !== excludeRoomId);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="forward-message-dialog-title"
    >
      <DialogTitle
        id="forward-message-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
        }}
      >
        Forward to…
        <Tooltip title="Close">
          <IconButton
            aria-label="Close forward dialog"
            onClick={onClose}
            disabled={busy}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {choices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No other conversations available. Start a chat first, then forward
            from here.
          </Typography>
        ) : (
          <List dense disablePadding>
            {choices.map((room) => (
              <ListItemButton
                key={room.id}
                disabled={busy}
                onClick={() => void onSelectRoom(room.id)}
              >
                <ListItemText
                  primary={getChatRoomLabel(room, currentUserId)}
                  secondary={
                    room.room_type === 'group' ? 'Group' : 'Direct message'
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

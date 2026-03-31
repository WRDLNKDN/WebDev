import { ForwardMessageDialog } from './ForwardMessageDialog';
import type { MessageWithExtras } from '../../../hooks/chatTypes';
import type { ChatRoomWithMembers } from '../../../hooks/chatTypes';

export type ChatForwardRoomDialogProps = {
  forwardSource: MessageWithExtras | null;
  setForwardSource: (v: MessageWithExtras | null) => void;
  rooms: ChatRoomWithMembers[];
  roomId: string | null | undefined;
  currentUserId: string;
  onSelectRoom: (targetRoomId: string) => Promise<void>;
  sending: boolean;
};

/** Single forward picker; same wiring as {@link ChatGroupForwardReportDialogs}. */
export const ChatForwardRoomDialog = ({
  forwardSource,
  setForwardSource,
  rooms,
  roomId,
  currentUserId,
  onSelectRoom,
  sending,
}: ChatForwardRoomDialogProps) => {
  if (roomId == null || roomId === '' || !currentUserId) {
    return null;
  }
  return (
    <ForwardMessageDialog
      open={Boolean(forwardSource)}
      onClose={() => setForwardSource(null)}
      rooms={rooms}
      excludeRoomId={roomId}
      currentUserId={currentUserId}
      onSelectRoom={onSelectRoom}
      busy={sending}
    />
  );
};

import { ChatForwardRoomDialog } from './ChatForwardRoomDialog';
import { GroupActionsDialog } from './GroupActionsDialog';
import { ReportDialog } from './ReportDialog';
import type { MessageWithExtras } from '../../../hooks/chatTypes';
import type { ChatRoomWithMembers } from '../../../hooks/chatTypes';
import type { ChatGroupDialogMode } from '../../../hooks/useChatGroupDialogs';
import type { ChatGroupDetailsInput } from '../../../lib/chat/groupDetails';
import type { ChatReportCategory } from '../../../types/chat';

export type ChatGroupForwardReportDialogsProps = {
  room: ChatRoomWithMembers | null;
  roomId: string | null | undefined;
  currentUserId: string;
  groupDialogOpen: boolean;
  setGroupDialogOpen: (open: boolean) => void;
  groupDialogMode: ChatGroupDialogMode;
  onSaveDetails: (details: ChatGroupDetailsInput) => Promise<void>;
  onInvite: (ids: string[]) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onTransferAdmin: (userId: string) => Promise<void>;
  forwardSource: MessageWithExtras | null;
  setForwardSource: (v: MessageWithExtras | null) => void;
  rooms: ChatRoomWithMembers[];
  handleForwardToRoom: (targetRoomId: string) => Promise<void>;
  sending: boolean;
  reportOpen: boolean;
  setReportOpen: (open: boolean) => void;
  setReportTarget: (v: { messageId?: string; userId?: string } | null) => void;
  reportTarget: { messageId?: string; userId?: string } | null;
  onReportSubmit: (
    messageId: string | null,
    userId: string | null,
    category: ChatReportCategory,
    freeText?: string,
  ) => Promise<void>;
};

export const ChatGroupForwardReportDialogs = ({
  room,
  roomId,
  currentUserId,
  groupDialogOpen,
  setGroupDialogOpen,
  groupDialogMode,
  onSaveDetails,
  onInvite,
  onRemove,
  onTransferAdmin,
  forwardSource,
  setForwardSource,
  rooms,
  handleForwardToRoom,
  sending,
  reportOpen,
  setReportOpen,
  setReportTarget,
  reportTarget,
  onReportSubmit,
}: ChatGroupForwardReportDialogsProps) => {
  return (
    <>
      {room && roomId ? (
        <GroupActionsDialog
          open={groupDialogOpen}
          mode={groupDialogMode}
          onClose={() => setGroupDialogOpen(false)}
          roomId={roomId}
          roomName={room.name ?? ''}
          roomDescription={room.description}
          roomImageUrl={room.image_url}
          currentMembers={room.members ?? []}
          currentUserId={currentUserId}
          onSaveDetails={onSaveDetails}
          onInvite={onInvite}
          onRemove={onRemove}
          onTransferAdmin={onTransferAdmin}
        />
      ) : null}
      <ChatForwardRoomDialog
        forwardSource={forwardSource}
        setForwardSource={setForwardSource}
        rooms={rooms}
        roomId={roomId}
        currentUserId={currentUserId}
        onSelectRoom={handleForwardToRoom}
        sending={sending}
      />
      <ReportDialog
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setReportTarget(null);
        }}
        onSubmit={onReportSubmit}
        reportedMessageId={reportTarget?.messageId ?? null}
        reportedUserId={reportTarget?.userId ?? null}
      />
    </>
  );
};

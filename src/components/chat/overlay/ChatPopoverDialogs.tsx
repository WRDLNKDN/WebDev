import { BlockConfirmDialog } from '../dialogs/BlockConfirmDialog';
import { GroupActionsDialog } from '../dialogs/GroupActionsDialog';
import { ReportDialog } from '../dialogs/ReportDialog';
import type { ChatRoomWithMembers } from '../../../hooks/useChat';
import type { ChatReportCategory } from '../../../types/chat';

type ChatPopoverDialogsProps = {
  room: ChatRoomWithMembers | null;
  roomId: string;
  uid: string;
  blockDialogOpen: boolean;
  groupDialogOpen: boolean;
  groupDialogMode: 'invite' | 'rename' | 'manage';
  reportOpen: boolean;
  reportTarget: { messageId?: string; userId?: string } | null;
  otherMember: {
    user_id: string;
    profile?: { display_name?: string | null; handle?: string | null } | null;
  } | null;
  onClose: () => void;
  onSetBlockDialogOpen: (open: boolean) => void;
  onSetGroupDialogOpen: (open: boolean) => void;
  onSetReportOpen: (open: boolean) => void;
  onSetReportTarget: (
    target: { messageId?: string; userId?: string } | null,
  ) => void;
  onBlockUser: (userId: string) => Promise<void>;
  onRenameRoom: (name: string) => Promise<void>;
  onInviteMembers: (memberIds: string[]) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onTransferAdmin: (memberId: string) => Promise<void>;
  onSubmitReport: (
    messageId: string | null,
    userId: string | null,
    category: ChatReportCategory,
    freeText?: string,
  ) => Promise<void>;
};

export const ChatPopoverDialogs = ({
  room,
  roomId,
  uid,
  blockDialogOpen,
  groupDialogOpen,
  groupDialogMode,
  reportOpen,
  reportTarget,
  otherMember,
  onClose,
  onSetBlockDialogOpen,
  onSetGroupDialogOpen,
  onSetReportOpen,
  onSetReportTarget,
  onBlockUser,
  onRenameRoom,
  onInviteMembers,
  onRemoveMember,
  onTransferAdmin,
  onSubmitReport,
}: ChatPopoverDialogsProps) => (
  <>
    <BlockConfirmDialog
      open={blockDialogOpen}
      onClose={() => onSetBlockDialogOpen(false)}
      onConfirm={async () => {
        if (!otherMember?.user_id) return;
        await onBlockUser(otherMember.user_id);
        onSetBlockDialogOpen(false);
        onClose();
      }}
      displayName={
        otherMember?.profile?.display_name ||
        otherMember?.profile?.handle ||
        'this user'
      }
    />
    {room && (
      <GroupActionsDialog
        open={groupDialogOpen}
        mode={groupDialogMode}
        onClose={() => onSetGroupDialogOpen(false)}
        roomId={roomId}
        roomName={room.name ?? ''}
        currentMembers={room.members ?? []}
        currentUserId={uid}
        onRename={onRenameRoom}
        onInvite={onInviteMembers}
        onRemove={onRemoveMember}
        onTransferAdmin={onTransferAdmin}
      />
    )}
    <ReportDialog
      open={reportOpen}
      onClose={() => {
        onSetReportOpen(false);
        onSetReportTarget(null);
      }}
      onSubmit={async (
        reportedMessageId,
        reportedUserId,
        category,
        freeText,
      ) => {
        await onSubmitReport(
          reportedMessageId ?? null,
          reportedUserId ?? null,
          category,
          freeText,
        );
      }}
      reportedMessageId={reportTarget?.messageId ?? null}
      reportedUserId={reportTarget?.userId ?? null}
    />
  </>
);

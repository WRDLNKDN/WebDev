import { BlockConfirmDialog } from '../../components/chat/dialogs/BlockConfirmDialog';
import { CreateGroupDialog } from '../../components/chat/dialogs/CreateGroupDialog';
import { GroupActionsDialog } from '../../components/chat/dialogs/GroupActionsDialog';
import { ReportDialog } from '../../components/chat/dialogs/ReportDialog';
import { StartDmDialog } from '../../components/chat/dialogs/StartDmDialog';
import type { ChatRoomWithMembers } from '../../hooks/useChat';
import type { ChatReportCategory } from '../../types/chat';
import type { ChatGroupDetailsInput } from '../../lib/chat/groupDetails';

type ChatPageDialogsProps = {
  uid: string;
  roomId?: string;
  room: ChatRoomWithMembers | null;
  otherMember:
    | {
        user_id: string;
        profile?: {
          display_name?: string | null;
          handle?: string | null;
        } | null;
      }
    | undefined;
  startDmOpen: boolean;
  startDmError: string | null;
  createGroupOpen: boolean;
  blockDialogOpen: boolean;
  groupDialogOpen: boolean;
  groupDialogMode: 'invite' | 'details' | 'manage' | 'members';
  reportOpen: boolean;
  reportTarget: { messageId?: string; userId?: string } | null;
  onSetStartDmOpen: (open: boolean) => void;
  onSetStartDmError: (value: string | null) => void;
  onSetCreateGroupOpen: (open: boolean) => void;
  onSetBlockDialogOpen: (open: boolean) => void;
  onSetGroupDialogOpen: (open: boolean) => void;
  onSetReportOpen: (open: boolean) => void;
  onSetReportTarget: (
    value: { messageId?: string; userId?: string } | null,
  ) => void;
  onStartDm: (userId: string) => Promise<void>;
  onCreateGroup: (
    details: ChatGroupDetailsInput,
    memberIds: string[],
  ) => Promise<void>;
  onBlock: () => Promise<void>;
  onSaveGroupDetails: (details: ChatGroupDetailsInput) => Promise<void>;
  onInviteMembers: (ids: string[]) => Promise<void>;
  onRemoveMember: (id: string) => Promise<void>;
  onTransferAdmin: (id: string) => Promise<void>;
  onReportSubmit: (
    messageId: string | null,
    userId: string | null,
    category: ChatReportCategory,
    freeText?: string,
  ) => Promise<void>;
};

export const ChatPageDialogs = ({
  uid,
  roomId,
  room,
  otherMember,
  startDmOpen,
  startDmError,
  createGroupOpen,
  blockDialogOpen,
  groupDialogOpen,
  groupDialogMode,
  reportOpen,
  reportTarget,
  onSetStartDmOpen,
  onSetStartDmError,
  onSetCreateGroupOpen,
  onSetBlockDialogOpen,
  onSetGroupDialogOpen,
  onSetReportOpen,
  onSetReportTarget,
  onStartDm,
  onCreateGroup,
  onBlock,
  onSaveGroupDetails,
  onInviteMembers,
  onRemoveMember,
  onTransferAdmin,
  onReportSubmit,
}: ChatPageDialogsProps) => (
  <>
    {startDmOpen ? (
      <StartDmDialog
        open={startDmOpen}
        onClose={() => {
          onSetStartDmOpen(false);
          onSetStartDmError(null);
        }}
        onSelect={onStartDm}
        startError={startDmError}
      />
    ) : null}
    {createGroupOpen ? (
      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => onSetCreateGroupOpen(false)}
        onCreate={onCreateGroup}
        currentUserId={uid}
      />
    ) : null}
    {blockDialogOpen ? (
      <BlockConfirmDialog
        open={blockDialogOpen}
        onClose={() => onSetBlockDialogOpen(false)}
        onConfirm={onBlock}
        displayName={
          otherMember?.profile?.display_name ||
          otherMember?.profile?.handle ||
          'this user'
        }
      />
    ) : null}
    {groupDialogOpen && roomId && room ? (
      <GroupActionsDialog
        open={groupDialogOpen}
        mode={groupDialogMode}
        onClose={() => onSetGroupDialogOpen(false)}
        roomId={roomId}
        roomName={room.name ?? ''}
        roomDescription={room.description}
        roomImageUrl={room.image_url}
        currentMembers={room.members ?? []}
        currentUserId={uid}
        onSaveDetails={onSaveGroupDetails}
        onInvite={onInviteMembers}
        onRemove={onRemoveMember}
        onTransferAdmin={onTransferAdmin}
      />
    ) : null}
    {reportOpen ? (
      <ReportDialog
        open={reportOpen}
        onClose={() => {
          onSetReportOpen(false);
          onSetReportTarget(null);
        }}
        onSubmit={onReportSubmit}
        reportedMessageId={reportTarget?.messageId ?? null}
        reportedUserId={reportTarget?.userId ?? null}
      />
    ) : null}
  </>
);

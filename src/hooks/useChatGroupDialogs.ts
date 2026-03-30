import { useCallback, useState } from 'react';

export type ChatGroupDialogMode = 'invite' | 'details' | 'manage' | 'members';

/**
 * Shared group-chat dialog mode + open handlers for ChatRoomHeader (full page, popout, popover).
 */
export function useChatGroupDialogs() {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupDialogMode, setGroupDialogMode] =
    useState<ChatGroupDialogMode>('invite');

  const openGroupDialog = useCallback((mode: ChatGroupDialogMode) => {
    setGroupDialogMode(mode);
    setGroupDialogOpen(true);
  }, []);

  const groupMenuHandlers = {
    onInvite: () => openGroupDialog('invite'),
    onEditDetails: () => openGroupDialog('details'),
    onManageMembers: () => openGroupDialog('manage'),
    onShowMembers: () => openGroupDialog('members'),
  } as const;

  return {
    groupDialogOpen,
    setGroupDialogOpen,
    groupDialogMode,
    groupMenuHandlers,
  };
}

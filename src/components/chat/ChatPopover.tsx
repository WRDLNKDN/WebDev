import { Box, CircularProgress, Typography } from '@mui/material';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ChatRoomHeader } from './ChatRoomHeader';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { BlockConfirmDialog } from './BlockConfirmDialog';
import { GroupActionsDialog } from './GroupActionsDialog';
import { ReportDialog } from './ReportDialog';
import { useChat, useReportMessage } from '../../hooks/useChat';
import { useChatPresence } from '../../hooks/useChatPresence';
import { supabase } from '../../lib/auth/supabaseClient';
import { GLASS_CARD } from '../../theme/candyStyles';

const POPOVER_WIDTH = 420;
const POPOVER_HEIGHT = 660;

type ChatPopoverProps = {
  roomId: string;
  onClose: () => void;
};

/**
 * Floating chat popover on the current page (not a new window).
 * Renders in a fixed bottom-right panel.
 */
export const ChatPopover = ({ roomId, onClose }: ChatPopoverProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupDialogMode, setGroupDialogMode] = useState<
    'invite' | 'rename' | 'manage'
  >('invite');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    messageId?: string;
    userId?: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const uid = session?.user?.id ?? undefined;

  const {
    room,
    messages,
    loading,
    error,
    sending,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    markAsRead,
    leaveRoom,
    renameRoom,
    removeMember,
    transferAdmin,
    inviteMembers,
    blockUser,
  } = useChat(roomId);
  const { submitReport } = useReportMessage();
  const { onlineUsers, typingUsers, startTyping, stopTyping } = useChatPresence(
    roomId,
    uid,
  );

  const otherMember = room?.members?.find((m) => m.user_id !== uid);
  const isRoomAdmin =
    room?.members?.find((m) => m.user_id === uid)?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSession(data.session ?? null);
    };
    void init();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!cancelled) setSession(s ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const { data } = await supabase.rpc('is_admin');
      setIsAdmin(data === true);
    })();
  }, [session]);

  const handleLeave = async () => {
    await leaveRoom();
    onClose();
  };

  const handleReport = (messageId?: string, userId?: string) => {
    setReportTarget({ messageId, userId });
    setReportOpen(true);
  };

  if (!session || !uid) return null;

  const content = (
    <>
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          ...GLASS_CARD,
          position: 'fixed',
          top: 80,
          right: 24,
          width: POPOVER_WIDTH,
          height: POPOVER_HEIGHT,
          zIndex: 1400,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          animation: 'popoverIn 0.25s cubic-bezier(0.32, 0, 0.37, 1)',
          '@keyframes popoverIn': {
            from: {
              opacity: 0,
              transform: 'scale(0.95) translateX(8px)',
            },
            to: {
              opacity: 1,
              transform: 'scale(1) translateX(0)',
            },
          },
        }}
      >
        <ChatRoomHeader
          room={room}
          currentUserId={uid}
          onlineUsers={onlineUsers}
          typingUsers={typingUsers}
          isRoomAdmin={isRoomAdmin ?? false}
          onLeave={handleLeave}
          onBlock={() => setBlockDialogOpen(true)}
          onInvite={() => {
            setGroupDialogMode('invite');
            setGroupDialogOpen(true);
          }}
          onRename={() => {
            setGroupDialogMode('rename');
            setGroupDialogOpen(true);
          }}
          onManageMembers={() => {
            setGroupDialogMode('manage');
            setGroupDialogOpen(true);
          }}
          onBack={onClose}
          closeIcon
        />

        {error && (
          <Typography color="error" variant="body2" sx={{ px: 2, py: 1 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={uid}
            roomType={room?.room_type ?? 'dm'}
            otherUserId={otherMember?.user_id}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onReaction={toggleReaction}
            onReport={handleReport}
            onMessagesViewed={markAsRead}
            isAdmin={isAdmin}
          />
        )}

        <MessageInput
          onSend={sendMessage}
          onTyping={startTyping}
          onStopTyping={stopTyping}
          disabled={sending || loading}
        />
      </Box>

      <BlockConfirmDialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        onConfirm={async () => {
          if (!otherMember?.user_id) return;
          await blockUser(otherMember.user_id);
          setBlockDialogOpen(false);
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
          onClose={() => setGroupDialogOpen(false)}
          roomId={roomId}
          roomName={room.name ?? ''}
          currentMembers={room.members ?? []}
          currentUserId={uid}
          onRename={renameRoom}
          onInvite={inviteMembers}
          onRemove={removeMember}
          onTransferAdmin={transferAdmin}
        />
      )}
      <ReportDialog
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setReportTarget(null);
        }}
        onSubmit={async (
          reportedMessageId,
          reportedUserId,
          category,
          freeText,
        ) => {
          await submitReport(
            reportedMessageId ?? undefined,
            reportedUserId ?? undefined,
            category,
            freeText,
          );
        }}
        reportedMessageId={reportTarget?.messageId ?? null}
        reportedUserId={reportTarget?.userId ?? null}
      />
    </>
  );

  return createPortal(
    <>
      <Box
        aria-hidden
        onClick={onClose}
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.35)',
          zIndex: 1399,
          animation: 'fadeIn 0.2s ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      />
      {content}
    </>,
    document.body,
  );
};

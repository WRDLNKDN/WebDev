import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ChatRoomHeader } from '../room/ChatRoomHeader';
import { MessageInput, type MessageReplyDraft } from '../message/MessageInput';
import { MessageList } from '../message/MessageList';
import { BlockConfirmDialog } from '../dialogs/BlockConfirmDialog';
import { GroupActionsDialog } from '../dialogs/GroupActionsDialog';
import { ForwardMessageDialog } from '../dialogs/ForwardMessageDialog';
import { ReportDialog } from '../dialogs/ReportDialog';
import type { MessageWithExtras } from '../../../hooks/chatTypes';
import {
  useChat,
  useChatRooms,
  useReportMessage,
} from '../../../hooks/useChat';
import { useChatPresence } from '../../../hooks/useChatPresence';
import { supabase } from '../../../lib/auth/supabaseClient';
import { useUatBannerOffset } from '../../../lib/utils/useUatBannerOffset';
import { useAppToast } from '../../../context/AppToastContext';
import { formatForwardedChatText } from '../../../lib/chat/formatForwardedChatText';
import { roomMembersToMentionable } from '../../../lib/chat/groupMentionMembers';
import { truncateSnippet } from '../../../lib/chat/messageSnippet';
import { getGlassCard } from '../../../theme/candyStyles';

const POPOVER_WIDTH = 460;
const POPOVER_HEIGHT = 740;

type ChatPopoverProps = {
  roomId: string;
  onClose: () => void;
  /** When provided (e.g. from Layout), avoids returning null while session loads. */
  session?: Session | null;
};

/**
 * Floating chat popover on the current page (not a new window).
 * Renders in a fixed bottom-right panel.
 */
export const ChatPopover = ({
  roomId,
  onClose,
  session: sessionProp,
}: ChatPopoverProps) => {
  const [sessionState, setSessionState] = useState<Session | null>(null);
  const session = sessionProp ?? sessionState;
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupDialogMode, setGroupDialogMode] = useState<
    'invite' | 'details' | 'manage' | 'members'
  >('invite');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    messageId?: string;
    userId?: string;
  } | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageReplyDraft | null>(
    null,
  );
  const [forwardSource, setForwardSource] = useState<MessageWithExtras | null>(
    null,
  );
  const topOffsetPx = 80 + useUatBannerOffset();

  const uid = session?.user?.id ?? undefined;
  const { showToast } = useAppToast();
  const { rooms } = useChatRooms();

  const {
    room,
    messages,
    loading,
    error,
    sending,
    hasOlderMessages,
    loadingOlder,
    loadOlderMessages,
    sendMessage,
    forwardMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    markAsRead,
    leaveRoom,
    updateGroupDetails,
    removeMember,
    transferAdmin,
    inviteMembers,
    blockUser,
    refresh,
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
    setReplyTarget(null);
    setForwardSource(null);
  }, [roomId]);

  useEffect(() => {
    if (sessionProp != null) return;
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSessionState(data.session ?? null);
    };
    void init();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!cancelled) setSessionState(s ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [sessionProp]);

  const forwardAuthorLabel = useCallback((m: MessageWithExtras) => {
    return (
      m.sender_profile?.display_name || m.sender_profile?.handle || 'Member'
    );
  }, []);

  const handleForwardToRoom = useCallback(
    async (targetRoomId: string) => {
      if (!forwardSource) return;
      const body = formatForwardedChatText(
        forwardSource.content,
        forwardAuthorLabel(forwardSource),
      );
      const ok = await forwardMessage(targetRoomId, body);
      if (ok) {
        setForwardSource(null);
        showToast({ message: 'Message forwarded.', severity: 'success' });
      }
    },
    [forwardAuthorLabel, forwardMessage, forwardSource, showToast],
  );

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
        sx={(t) => ({
          ...getGlassCard(t),
          position: 'fixed',
          top: topOffsetPx,
          right: 24,
          width: POPOVER_WIDTH,
          height: POPOVER_HEIGHT,
          zIndex: 1400,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          borderRadius: 3,
          boxShadow:
            t.palette.mode === 'light'
              ? `0 12px 32px ${alpha(t.palette.common.black, 0.08)}, 0 0 0 1px ${alpha(t.palette.divider, 0.2)}`
              : `0 14px 40px ${alpha(t.palette.common.black, 0.28)}, 0 0 0 1px ${alpha(t.palette.primary.main, 0.08)}`,
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
        })}
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
          onEditDetails={() => {
            setGroupDialogMode('details');
            setGroupDialogOpen(true);
          }}
          onManageMembers={() => {
            setGroupDialogMode('manage');
            setGroupDialogOpen(true);
          }}
          onShowMembers={() => {
            setGroupDialogMode('members');
            setGroupDialogOpen(true);
          }}
          onBack={onClose}
          closeIcon
        />

        {error && !loading && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              textAlign: 'center',
              gap: 1.5,
            }}
          >
            <Typography color="error" variant="body2" fontWeight={500}>
              {error}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This conversation may have been removed.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => void refresh()}
              sx={{ mt: 0.5 }}
            >
              Try again
            </Button>
          </Box>
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
        ) : error ? null : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <MessageList
              messages={messages}
              currentUserId={uid}
              roomType={room?.room_type ?? 'dm'}
              otherUserId={otherMember?.user_id}
              onLoadOlder={() => void loadOlderMessages()}
              hasOlderMessages={hasOlderMessages}
              loadingOlder={loadingOlder}
              onEdit={editMessage}
              onDelete={deleteMessage}
              onReaction={toggleReaction}
              onReport={(msgId, senderUserId) =>
                handleReport(msgId, senderUserId ?? undefined)
              }
              onStartReply={(msg) =>
                setReplyTarget({
                  id: msg.id,
                  authorLabel: forwardAuthorLabel(msg),
                  contentSnippet: truncateSnippet(msg.content ?? ''),
                })
              }
              onForward={(msg) => setForwardSource(msg)}
              onMessagesViewed={markAsRead}
              compact
              typingAvatarUrl={
                room?.room_type === 'dm'
                  ? (otherMember?.profile?.avatar ?? null)
                  : undefined
              }
              showTyping={
                room?.room_type === 'dm' &&
                !!otherMember?.user_id &&
                typingUsers.has(otherMember.user_id)
              }
            />
          </Box>
        )}

        {!error && (
          <Box sx={{ flexShrink: 0 }}>
            <MessageInput
              onSend={sendMessage}
              onTyping={startTyping}
              onStopTyping={stopTyping}
              disabled={false}
              sending={sending}
              roomType={room?.room_type ?? 'dm'}
              roomId={roomId}
              groupMembers={roomMembersToMentionable(room)}
              currentUserId={session?.user?.id}
              replyTo={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
            />
          </Box>
        )}
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
          roomDescription={room.description}
          roomImageUrl={room.image_url}
          currentMembers={room.members ?? []}
          currentUserId={uid}
          onSaveDetails={updateGroupDetails}
          onInvite={inviteMembers}
          onRemove={removeMember}
          onTransferAdmin={transferAdmin}
        />
      )}
      <ForwardMessageDialog
        open={Boolean(forwardSource)}
        onClose={() => setForwardSource(null)}
        rooms={rooms}
        excludeRoomId={roomId}
        currentUserId={uid}
        onSelectRoom={handleForwardToRoom}
        busy={sending}
      />
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

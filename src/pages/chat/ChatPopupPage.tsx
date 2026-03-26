import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChatRoomHeader } from '../../components/chat/room/ChatRoomHeader';
import {
  MessageInput,
  type MessageReplyDraft,
} from '../../components/chat/message/MessageInput';
import { MessageList } from '../../components/chat/message/MessageList';
import { ForwardMessageDialog } from '../../components/chat/dialogs/ForwardMessageDialog';
import { BlockConfirmDialog } from '../../components/chat/dialogs/BlockConfirmDialog';
import { GroupActionsDialog } from '../../components/chat/dialogs/GroupActionsDialog';
import { ReportDialog } from '../../components/chat/dialogs/ReportDialog';
import type { MessageWithExtras } from '../../hooks/chatTypes';
import { useChat, useChatRooms, useReportMessage } from '../../hooks/useChat';
import { useChatPresence } from '../../hooks/useChatPresence';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  getDefaultChatDocumentTitle,
  resolveChatDocumentTitle,
} from '../../lib/chat/documentTitle';
import { useAppToast } from '../../context/AppToastContext';
import { formatForwardedChatText } from '../../lib/chat/formatForwardedChatText';
import { roomMembersToMentionable } from '../../lib/chat/groupMentionMembers';
import { truncateSnippet } from '../../lib/chat/messageSnippet';

/**
 * Standalone popout chat window (LinkedIn-style).
 * Renders a single conversation with minimal chrome - no navbar, no list.
 */
export const ChatPopupPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [replyTarget, setReplyTarget] = useState<MessageReplyDraft | null>(
    null,
  );
  const [forwardSource, setForwardSource] = useState<MessageWithExtras | null>(
    null,
  );

  const uid = session?.user?.id ?? undefined;
  const { showToast } = useAppToast();

  const { rooms, toggleFavorite } = useChatRooms();
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
    renameRoom,
    removeMember,
    transferAdmin,
    inviteMembers,
    blockUser,
  } = useChat(roomId ?? null);
  const { submitReport } = useReportMessage();
  const { onlineUsers, typingUsers, startTyping, stopTyping } = useChatPresence(
    roomId ?? null,
    uid,
  );

  const otherMember = room?.members?.find((m) => m.user_id !== uid);
  const activeRoom = rooms.find((candidate) => candidate.id === roomId) ?? null;
  const isRoomAdmin =
    room?.members?.find((m) => m.user_id === uid)?.role === 'admin';

  // Clear message query param after scrolling (clean URL)
  useEffect(() => {
    const messageId = searchParams.get('message');
    if (messageId && messages.some((m) => m.id === messageId)) {
      // Message is loaded, remove query param after a delay to allow scroll
      const timer = setTimeout(() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('message');
        setSearchParams(newParams, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [messages, searchParams, setSearchParams]);

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
    setReplyTarget(null);
    setForwardSource(null);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      document.title = getDefaultChatDocumentTitle();
      return;
    }

    document.title = resolveChatDocumentTitle(room, uid, roomId);
  }, [room, roomId, uid]);

  const handleLeave = async () => {
    await leaveRoom();
    if (window.opener) {
      window.close();
    }
  };

  const handleReport = (messageId?: string, userId?: string) => {
    setReportTarget({ messageId, userId });
    setReportOpen(true);
  };

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

  if (!roomId) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No conversation selected</Typography>
      </Box>
    );
  }

  if (!session || !uid) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Typography color="text.secondary" component="p">
          Sign in to view this conversation
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          color: 'text.primary',
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
          isFavorite={Boolean(activeRoom?.is_favorite)}
          onToggleFavorite={
            roomId
              ? () =>
                  void toggleFavorite(roomId, Boolean(activeRoom?.is_favorite))
              : undefined
          }
          onBack={() =>
            window.opener ? window.close() : window.history.back()
          }
        />

        {error && !loading && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              textAlign: 'center',
            }}
          >
            <Typography color="error" variant="body1" fontWeight={500}>
              {error}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You may not have access to this conversation, or it may have been
              deleted.
            </Typography>
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
            scrollToMessageId={searchParams.get('message')}
          />
        )}

        {!error && (
          <MessageInput
            onSend={sendMessage}
            onTyping={startTyping}
            onStopTyping={stopTyping}
            disabled={loading}
            sending={sending}
            roomType={room?.room_type ?? 'dm'}
            roomId={roomId ?? null}
            groupMembers={roomMembersToMentionable(room)}
            currentUserId={uid}
            replyTo={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
          />
        )}
      </Box>

      <BlockConfirmDialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        onConfirm={async () => {
          if (!otherMember?.user_id) return;
          await blockUser(otherMember.user_id);
          setBlockDialogOpen(false);
          if (window.opener) window.close();
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
      {roomId && uid ? (
        <ForwardMessageDialog
          open={Boolean(forwardSource)}
          onClose={() => setForwardSource(null)}
          rooms={rooms}
          excludeRoomId={roomId}
          currentUserId={uid}
          onSelectRoom={handleForwardToRoom}
          busy={sending}
        />
      ) : null}
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
};

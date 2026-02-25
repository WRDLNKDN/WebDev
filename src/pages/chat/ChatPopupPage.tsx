import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useParams } from 'react-router-dom';
import { ChatRoomHeader } from '../../components/chat/ChatRoomHeader';
import { MessageInput } from '../../components/chat/MessageInput';
import { MessageList } from '../../components/chat/MessageList';
import { BlockConfirmDialog } from '../../components/chat/BlockConfirmDialog';
import { GroupActionsDialog } from '../../components/chat/GroupActionsDialog';
import { ReportDialog } from '../../components/chat/ReportDialog';
import { useChat, useReportMessage } from '../../hooks/useChat';
import { useChatPresence } from '../../hooks/useChatPresence';
import { supabase } from '../../lib/auth/supabaseClient';

/**
 * Standalone popout chat window (LinkedIn-style).
 * Renders a single conversation with minimal chrome - no navbar, no list.
 */
export const ChatPopupPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
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
    hasOlderMessages,
    loadingOlder,
    loadOlderMessages,
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
  } = useChat(roomId ?? null);
  const { submitReport } = useReportMessage();
  const { onlineUsers, typingUsers, startTyping, stopTyping } = useChatPresence(
    roomId ?? null,
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
    if (window.opener) {
      window.close();
    }
  };

  const handleReport = (messageId?: string, userId?: string) => {
    setReportTarget({ messageId, userId });
    setReportOpen(true);
  };

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
          minHeight: '100vh',
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
          minHeight: '100vh',
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
            onReport={handleReport}
            onMessagesViewed={markAsRead}
            isAdmin={isAdmin}
            compact
          />
        )}

        {!error && (
          <MessageInput
            onSend={sendMessage}
            onTyping={startTyping}
            onStopTyping={stopTyping}
            disabled={sending || loading}
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

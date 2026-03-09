import { Box } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatRoomList } from '../../components/chat/room/ChatRoomList';
import { useChat, useChatRooms, useReportMessage } from '../../hooks/useChat';
import { useChatPresence } from '../../hooks/useChatPresence';
import { supabase } from '../../lib/auth/supabaseClient';
import { GLASS_CARD } from '../../theme/candyStyles';
import { ChatPageContentPane } from './ChatPageContentPane';
import { ChatPageDialogs } from './ChatPageDialogs';

export const ChatPage = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [startDmOpen, setStartDmOpen] = useState(false);
  const [startDmError, setStartDmError] = useState<string | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    messageId?: string;
    userId?: string;
  } | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupDialogMode, setGroupDialogMode] = useState<
    'invite' | 'rename' | 'manage'
  >('invite');

  const {
    rooms,
    loading: roomsLoading,
    removeChat,
    createDm,
    createGroup,
    fetchRooms,
  } = useChatRooms();
  const {
    room,
    messages,
    loading: chatLoading,
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
    refresh,
  } = useChat(roomId ?? null);

  const { submitReport } = useReportMessage();
  const uid = session?.user?.id;
  const { onlineUsers, typingUsers, startTyping, stopTyping } = useChatPresence(
    roomId ?? null,
    uid ?? undefined,
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        navigate('/');
      } else {
        setSession(data.session);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const { data } = await supabase.rpc('is_admin');
      setIsAdmin(data === true);
    })();
  }, [session]);

  const handleStartDm = async (userId: string) => {
    setStartDmError(null);
    try {
      const id = await createDm(userId);
      if (id) {
        setStartDmOpen(false);
        navigate(`/chat-full/${id}`);
      } else {
        setStartDmError('Could not start chat. Please try again.');
      }
    } catch (err) {
      setStartDmError(
        err instanceof Error
          ? err.message
          : 'Could not start chat. Please try again.',
      );
    }
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    const id = await createGroup(name, memberIds);
    if (id) navigate(`/chat-full/${id}`);
  };

  const handleReport = (messageId?: string, userId?: string) => {
    setReportTarget({ messageId, userId });
    setReportOpen(true);
  };

  const otherMember = room?.members?.find((m) => m.user_id !== uid);
  const isRoomAdmin =
    room?.members?.find((m) => m.user_id === uid)?.role === 'admin';

  const handleBlock = async () => {
    if (!otherMember?.user_id) return;
    await blockUser(otherMember.user_id);
    navigate('/chat-full');
  };

  const handleLeave = async () => {
    await leaveRoom();
    await fetchRooms();
    navigate('/chat-full');
  };

  const handleRemoveChat = async (targetRoomId: string) => {
    await removeChat(targetRoomId);
    if (roomId === targetRoomId) navigate('/chat-full');
  };

  const handleReportSubmit = async (
    reportedMessageId: string | null,
    reportedUserId: string | null,
    category: Parameters<typeof submitReport>[2],
    freeText?: string,
  ) => {
    await submitReport(
      reportedMessageId ?? undefined,
      reportedUserId ?? undefined,
      category,
      freeText,
    );
  };

  if (!session || !uid) return null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: {
          xs: 'url("/assets/background-mobile.png")',
          md: 'url("/assets/background-desktop.png")',
        },
        backgroundSize: 'cover',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          ...GLASS_CARD,
          m: { xs: 1, sm: 2 },
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: { xs: roomId ? 'none' : 'flex', md: 'flex' },
            width: { xs: '100%', md: 280 },
            minWidth: { xs: 0, md: 280 },
            flexShrink: 0,
            borderRight: { xs: 'none', md: '1px solid rgba(255,255,255,0.1)' },
            flexDirection: 'column',
          }}
        >
          <ChatRoomList
            rooms={rooms}
            loading={roomsLoading}
            currentUserId={uid}
            onStartDm={() => setStartDmOpen(true)}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onRemoveChat={handleRemoveChat}
            chatPathPrefix="/chat-full"
          />
        </Box>

        <ChatPageContentPane
          roomId={roomId}
          uid={uid}
          room={room}
          onlineUsers={onlineUsers}
          typingUsers={typingUsers}
          isRoomAdmin={isRoomAdmin ?? false}
          otherMember={otherMember}
          messages={messages}
          chatLoading={chatLoading}
          error={error}
          sending={sending}
          hasOlderMessages={hasOlderMessages}
          loadingOlder={loadingOlder}
          isAdmin={isAdmin}
          onLeave={handleLeave}
          onOpenBlock={() => setBlockDialogOpen(true)}
          onOpenInvite={() => {
            setGroupDialogMode('invite');
            setGroupDialogOpen(true);
          }}
          onOpenRename={() => {
            setGroupDialogMode('rename');
            setGroupDialogOpen(true);
          }}
          onOpenManage={() => {
            setGroupDialogMode('manage');
            setGroupDialogOpen(true);
          }}
          onBack={() => navigate('/chat-full')}
          onRefresh={() => void refresh()}
          onLoadOlder={() => void loadOlderMessages()}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          onToggleReaction={toggleReaction}
          onReport={handleReport}
          onMessagesViewed={markAsRead}
          onSendMessage={sendMessage}
          onTyping={startTyping}
          onStopTyping={stopTyping}
          onStartDm={() => setStartDmOpen(true)}
          onCreateGroup={() => setCreateGroupOpen(true)}
        />
      </Box>

      <ChatPageDialogs
        uid={uid}
        roomId={roomId}
        room={room}
        otherMember={otherMember}
        startDmOpen={startDmOpen}
        startDmError={startDmError}
        createGroupOpen={createGroupOpen}
        blockDialogOpen={blockDialogOpen}
        groupDialogOpen={groupDialogOpen}
        groupDialogMode={groupDialogMode}
        reportOpen={reportOpen}
        reportTarget={reportTarget}
        onSetStartDmOpen={setStartDmOpen}
        onSetStartDmError={setStartDmError}
        onSetCreateGroupOpen={setCreateGroupOpen}
        onSetBlockDialogOpen={setBlockDialogOpen}
        onSetGroupDialogOpen={setGroupDialogOpen}
        onSetReportOpen={setReportOpen}
        onSetReportTarget={setReportTarget}
        onStartDm={handleStartDm}
        onCreateGroup={handleCreateGroup}
        onBlock={handleBlock}
        onRenameRoom={renameRoom}
        onInviteMembers={inviteMembers}
        onRemoveMember={removeMember}
        onTransferAdmin={transferAdmin}
        onReportSubmit={handleReportSubmit}
      />
    </Box>
  );
};

import { Box, Button, CircularProgress, Typography } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockConfirmDialog } from '../../components/chat/dialogs/BlockConfirmDialog';
import { ChatRoomHeader } from '../../components/chat/room/ChatRoomHeader';
import { ChatRoomList } from '../../components/chat/room/ChatRoomList';
import { CreateGroupDialog } from '../../components/chat/dialogs/CreateGroupDialog';
import { GroupActionsDialog } from '../../components/chat/dialogs/GroupActionsDialog';
import { MessageInput } from '../../components/chat/message/MessageInput';
import { MessageList } from '../../components/chat/message/MessageList';
import { ReportDialog } from '../../components/chat/dialogs/ReportDialog';
import { StartDmDialog } from '../../components/chat/dialogs/StartDmDialog';
import { useChat, useChatRooms, useReportMessage } from '../../hooks/useChat';
import { useChatPresence } from '../../hooks/useChatPresence';
import { supabase } from '../../lib/auth/supabaseClient';
import { GLASS_CARD } from '../../theme/candyStyles';

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
        flex: 1,
        minHeight: 0,
        height: '100%',
        maxHeight: '100%',
        minWidth: 0,
        width: '100%',
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
          height: '100%',
          minWidth: 0,
          maxWidth: '100%',
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
            maxWidth: '100%',
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

        <Box
          sx={{
            flex: 1,
            display: { xs: roomId ? 'flex' : 'none', md: 'flex' },
            flexDirection: 'column',
            minHeight: 0,
            minWidth: 0,
            maxWidth: '100%',
            overflowX: 'hidden',
            overflowY: 'hidden',
          }}
        >
          {roomId ? (
            <>
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
                onBack={() => navigate('/chat-full')}
              />

              {error && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography color="error" variant="body2">
                    {error}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void refresh()}
                  >
                    Try again
                  </Button>
                </Box>
              )}

              {chatLoading ? (
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
                  onLoadOlder={() => void loadOlderMessages()}
                  hasOlderMessages={hasOlderMessages}
                  loadingOlder={loadingOlder}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onReaction={toggleReaction}
                  onReport={(msgId) => handleReport(msgId)}
                  onMessagesViewed={markAsRead}
                  isAdmin={isAdmin}
                  typingAvatarUrl={
                    room?.room_type === 'dm'
                      ? (otherMember?.profile?.avatar ?? null)
                      : undefined
                  }
                  showTyping={
                    !!(
                      room?.room_type === 'dm' &&
                      otherMember?.user_id &&
                      typingUsers.has(otherMember.user_id)
                    )
                  }
                />
              )}

              <MessageInput
                onSend={sendMessage}
                onTyping={startTyping}
                onStopTyping={stopTyping}
                disabled={chatLoading}
                sending={sending}
              />
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                Select a conversation or start a new chat
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => setStartDmOpen(true)}
                >
                  New 1:1 chat
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setCreateGroupOpen(true)}
                >
                  New group
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <StartDmDialog
        open={startDmOpen}
        onClose={() => {
          setStartDmOpen(false);
          setStartDmError(null);
        }}
        onSelect={handleStartDm}
        startError={startDmError}
      />
      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreate={handleCreateGroup}
        currentUserId={uid ?? undefined}
      />
      <BlockConfirmDialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        onConfirm={handleBlock}
        displayName={
          otherMember?.profile?.display_name ||
          otherMember?.profile?.handle ||
          'this user'
        }
      />
      {roomId && room && (
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
        onSubmit={handleReportSubmit}
        reportedMessageId={reportTarget?.messageId ?? null}
        reportedUserId={reportTarget?.userId ?? null}
      />
    </Box>
  );
};

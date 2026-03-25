import {
  Box,
  Button,
  CircularProgress,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import {
  getDefaultChatDocumentTitle,
  resolveChatDocumentTitle,
} from '../../lib/chat/documentTitle';
import { roomMembersToMentionable } from '../../lib/chat/groupMentionMembers';
import { getGlassCard } from '../../theme/candyStyles';

export const ChatPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
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
    toggleFavorite,
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
    if (!session) return;
    void (async () => {
      const { data } = await supabase.rpc('is_admin');
      setIsAdmin(data === true);
    })();
  }, [session]);

  useEffect(() => {
    if (!roomId) {
      document.title = getDefaultChatDocumentTitle();
      return;
    }

    document.title = resolveChatDocumentTitle(room, uid, roomId);
  }, [room, roomId, uid]);

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
  const activeRoom = rooms.find((candidate) => candidate.id === roomId) ?? null;
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
          ...getGlassCard(theme),
          m: { xs: 0.75, sm: 1.25, md: 2 },
          overflow: 'hidden',
          borderRadius: { xs: 2.5, md: 3 },
        }}
      >
        <Box
          sx={{
            display: { xs: roomId ? 'none' : 'flex', md: 'flex' },
            width: { xs: '100%', md: 320, lg: 340 },
            minWidth: { xs: 0, md: 320, lg: 340 },
            maxWidth: '100%',
            flexShrink: 0,
            borderRight: {
              xs: 'none',
              md: `1px solid ${alpha(theme.palette.primary.light, 0.22)}`,
            },
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
            onToggleFavorite={toggleFavorite}
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
            background:
              'linear-gradient(180deg, rgba(6,10,20,0.16) 0%, rgba(6,10,20,0.04) 100%)',
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
                isFavorite={Boolean(activeRoom?.is_favorite)}
                onToggleFavorite={
                  roomId
                    ? () =>
                        void toggleFavorite(
                          roomId,
                          Boolean(activeRoom?.is_favorite),
                        )
                    : undefined
                }
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
                  scrollToMessageId={searchParams.get('message')}
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
                roomType={room?.room_type ?? 'dm'}
                roomId={roomId ?? null}
                groupMembers={roomMembersToMentionable(room)}
                currentUserId={uid}
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

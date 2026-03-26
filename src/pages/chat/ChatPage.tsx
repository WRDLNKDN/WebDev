import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppToast } from '../../context/AppToastContext';
import { ForwardMessageDialog } from '../../components/chat/dialogs/ForwardMessageDialog';
import { BlockConfirmDialog } from '../../components/chat/dialogs/BlockConfirmDialog';
import { ChatRoomHeader } from '../../components/chat/room/ChatRoomHeader';
import { ChatRoomList } from '../../components/chat/room/ChatRoomList';
import { CreateGroupDialog } from '../../components/chat/dialogs/CreateGroupDialog';
import { GroupActionsDialog } from '../../components/chat/dialogs/GroupActionsDialog';
import {
  MessageInput,
  type MessageReplyDraft,
} from '../../components/chat/message/MessageInput';
import { MessageList } from '../../components/chat/message/MessageList';
import { ReportDialog } from '../../components/chat/dialogs/ReportDialog';
import { StartDmDialog } from '../../components/chat/dialogs/StartDmDialog';
import type { MessageWithExtras } from '../../hooks/chatTypes';
import { useChat, useChatRooms, useReportMessage } from '../../hooks/useChat';
import { useChatPresence } from '../../hooks/useChatPresence';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  getDefaultChatDocumentTitle,
  resolveChatDocumentTitle,
} from '../../lib/chat/documentTitle';
import { formatForwardedChatText } from '../../lib/chat/formatForwardedChatText';
import { roomMembersToMentionable } from '../../lib/chat/groupMentionMembers';
import { truncateSnippet } from '../../lib/chat/messageSnippet';
import { useUatBannerOffset } from '../../lib/utils/useUatBannerOffset';
import { getGlassCard } from '../../theme/candyStyles';
import { ChatPageEmptyState } from './ChatPageEmptyState';

export const ChatPage = () => {
  const theme = useTheme();
  const isMobileLayout = useMediaQuery(theme.breakpoints.down('md'));
  const bannerOffsetPx = useUatBannerOffset();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
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
  const [replyTarget, setReplyTarget] = useState<MessageReplyDraft | null>(
    null,
  );
  const [forwardSource, setForwardSource] = useState<MessageWithExtras | null>(
    null,
  );

  const { showToast } = useAppToast();

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
    if (!roomId) {
      document.title = getDefaultChatDocumentTitle();
      return;
    }

    document.title = resolveChatDocumentTitle(room, uid, roomId);
  }, [room, roomId, uid]);

  useEffect(() => {
    setReplyTarget(null);
    setForwardSource(null);
  }, [roomId]);

  useEffect(() => {
    if (isMobileLayout) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/feed');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileLayout, navigate]);

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

  const closeDockedChat = () => {
    navigate('/feed');
  };

  const dockTopPx = 64 + bannerOffsetPx;

  const listColumn = (
    <Box
      sx={{
        display: { xs: roomId ? 'none' : 'flex', md: 'flex' },
        width: { xs: '100%', md: 300, lg: 328 },
        minWidth: { xs: 0, md: 300, lg: 328 },
        maxWidth: '100%',
        flexShrink: 0,
        borderRight: {
          xs: 'none',
          md: `1px solid ${alpha(theme.palette.primary.light, 0.22)}`,
        },
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: isMobileLayout
          ? 'transparent'
          : alpha(theme.palette.background.default, 0.65),
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
        showMessagesHeading={isMobileLayout}
      />
    </Box>
  );

  const threadColumn = (
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
        background: isMobileLayout
          ? 'linear-gradient(180deg, rgba(6,10,20,0.16) 0%, rgba(6,10,20,0.04) 100%)'
          : alpha(theme.palette.background.paper, 0.92),
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
            replyTo={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
          />
        </>
      ) : (
        <ChatPageEmptyState
          variant={isMobileLayout ? 'page' : 'docked'}
          onStartDm={() => setStartDmOpen(true)}
          onCreateGroup={() => setCreateGroupOpen(true)}
        />
      )}
    </Box>
  );

  const splitWorkspace = (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {listColumn}
      {threadColumn}
    </Box>
  );

  const dialogs = (
    <>
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
        onSubmit={handleReportSubmit}
        reportedMessageId={reportTarget?.messageId ?? null}
        reportedUserId={reportTarget?.userId ?? null}
      />
    </>
  );

  if (!isMobileLayout) {
    return (
      <>
        <Box
          aria-hidden
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            pointerEvents: 'none',
          }}
        />
        {createPortal(
          <>
            <Box
              role="presentation"
              aria-hidden
              onClick={closeDockedChat}
              sx={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                top: dockTopPx,
                zIndex: 1250,
                bgcolor: 'rgba(2, 6, 18, 0.58)',
                backdropFilter: 'blur(3px)',
              }}
            />
            <Box
              role="dialog"
              aria-modal="true"
              aria-labelledby="chat-dock-title"
              onClick={(e) => e.stopPropagation()}
              sx={{
                position: 'fixed',
                zIndex: 1300,
                top: `calc(${dockTopPx}px + 12px)`,
                right: { xs: 12, md: 20 },
                bottom: { xs: 12, md: 20 },
                left: { xs: 12, md: 'auto' },
                width: {
                  xs: 'calc(100vw - 24px)',
                  md: 'min(1080px, calc(100vw - 48px))',
                },
                maxWidth: 'calc(100vw - 24px)',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                boxShadow: 24,
                border: `1px solid ${alpha(theme.palette.divider, 0.25)}`,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2,
                  py: 1.25,
                  flexShrink: 0,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  bgcolor: alpha(theme.palette.background.default, 0.55),
                }}
              >
                <Typography
                  id="chat-dock-title"
                  variant="subtitle1"
                  fontWeight={700}
                >
                  Messages
                </Typography>
                <IconButton
                  aria-label="Close messages"
                  onClick={closeDockedChat}
                  size="small"
                  edge="end"
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'background.default',
                }}
              >
                {splitWorkspace}
              </Box>
            </Box>
          </>,
          document.body,
        )}
        {dialogs}
      </>
    );
  }

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
        backgroundImage: 'url("/assets/background-mobile.png")',
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
          m: { xs: 0.75, sm: 1.25 },
          overflow: 'hidden',
          borderRadius: { xs: 2.5, md: 3 },
        }}
      >
        {splitWorkspace}
      </Box>
      {dialogs}
    </Box>
  );
};

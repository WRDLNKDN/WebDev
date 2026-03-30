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
import { ChatThreadMessageList } from '../../components/chat/message/ChatThreadMessageList';
import { ReportDialog } from '../../components/chat/dialogs/ReportDialog';
import { StartDmDialog } from '../../components/chat/dialogs/StartDmDialog';
import type { MessageWithExtras } from '../../hooks/chatTypes';
import { useChatForwardToRoomFlow } from '../../hooks/useChatForwardToRoomFlow';
import { useChat, useChatRooms, useReportMessage } from '../../hooks/useChat';
import { useChatGroupDialogs } from '../../hooks/useChatGroupDialogs';
import { useChatPresence } from '../../hooks/useChatPresence';
import { supabase } from '../../lib/auth/supabaseClient';
import type { ChatGroupDetailsInput } from '../../lib/chat/groupDetails';
import {
  getDefaultChatDocumentTitle,
  resolveChatDocumentTitle,
} from '../../lib/chat/documentTitle';
import { roomMembersToMentionable } from '../../lib/chat/groupMentionMembers';
import { useUatBannerOffset } from '../../lib/utils/useUatBannerOffset';
import { getGlassCard } from '../../theme/candyStyles';

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
  const {
    groupDialogOpen,
    setGroupDialogOpen,
    groupDialogMode,
    groupMenuHandlers,
  } = useChatGroupDialogs();
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
    updateGroupDetails,
    removeMember,
    transferAdmin,
    inviteMembers,
    blockUser,
    refresh,
    refetchRoom,
  } = useChat(roomId ?? null);

  const { submitReport } = useReportMessage();
  const uid = session?.user?.id;
  const { onlineUsers, typingUsers, startTyping, stopTyping } = useChatPresence(
    roomId ?? null,
    uid ?? undefined,
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        navigate('/');
      } else {
        setSession(data.session);
      }
    })().catch(() => {});
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
      if (e.key !== 'Escape') return;
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      const activeElement = document.activeElement as HTMLElement | null;
      const appMain = document.querySelector<HTMLElement>(
        '[data-testid="app-main"]',
      );
      const interactiveTarget = target?.closest(
        'button, a, input, textarea, select, [role="button"], [role="link"], [role="textbox"], [role="combobox"], [tabindex]',
      );
      const pageShortcutFocusTarget =
        !activeElement ||
        activeElement === document.body ||
        activeElement === document.documentElement ||
        activeElement === appMain;
      if (
        !pageShortcutFocusTarget ||
        interactiveTarget ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (
        document.querySelector('[role="alert"], [role="status"]') ||
        document.querySelector(
          '[role="dialog"][aria-modal="true"], [role="listbox"]',
        )
      ) {
        return;
      }

      navigate('/feed');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileLayout, navigate]);

  const { forwardAuthorLabel, handleForwardToRoom } = useChatForwardToRoomFlow(
    forwardMessage,
    forwardSource,
    setForwardSource,
    showToast,
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

  const handleCreateGroup = async (
    details: ChatGroupDetailsInput,
    memberIds: string[],
  ) => {
    const id = await createGroup(details, memberIds);
    if (id) navigate(`/chat-full/${id}`);
  };

  const handleReport = (messageId?: string, userId?: string) => {
    setReportTarget({ messageId, userId });
    setReportOpen(true);
  };

  const otherMember = room?.members?.find((m) => m.user_id !== uid);
  const activeRoom = rooms.find((candidate) => candidate.id === roomId) ?? null;
  const resolvedThreadFavorite =
    activeRoom === null
      ? Boolean(room?.is_favorite ?? false)
      : Boolean(activeRoom.is_favorite);
  const handleToggleFavorite = useCallback(
    async (targetRoomId: string, currentlyFavorite: boolean) => {
      await toggleFavorite(targetRoomId, currentlyFavorite);
      if (roomId === targetRoomId) await refetchRoom();
    },
    [toggleFavorite, roomId, refetchRoom],
  );
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
  const showThread = Boolean(roomId);
  const dockWidth = showThread
    ? 'clamp(860px, 66vw, 1120px)'
    : 'clamp(420px, 34vw, 480px)';

  const listColumnDividerAlpha = theme.palette.mode === 'light' ? 0.1 : 0.08;
  const listColumnBorderRightMd = showThread
    ? `1px solid ${alpha(theme.palette.divider, listColumnDividerAlpha)}`
    : 'none';
  const listColumnPaperAlpha = theme.palette.mode === 'light' ? 0.72 : 0.55;
  const listColumnBgcolor = isMobileLayout
    ? 'transparent'
    : alpha(theme.palette.background.paper, listColumnPaperAlpha);

  let threadColumnBackground: string;
  if (isMobileLayout) {
    threadColumnBackground =
      'linear-gradient(180deg, rgba(6,10,20,0.14) 0%, rgba(6,10,20,0.03) 100%)';
  } else if (theme.palette.mode === 'light') {
    threadColumnBackground = alpha(theme.palette.background.default, 0.98);
  } else {
    threadColumnBackground = `linear-gradient(180deg, ${alpha('#121722', 0.99)} 0%, ${alpha(theme.palette.background.default, 0.96)} 55%)`;
  }

  const listColumn = (
    <Box
      sx={{
        display: { xs: roomId ? 'none' : 'flex', md: 'flex' },
        width: { xs: '100%', md: showThread ? 280 : '100%' },
        minWidth: { xs: 0, md: showThread ? 280 : 0 },
        maxWidth: { xs: '100%', md: showThread ? 280 : '100%' },
        flexShrink: 0,
        borderRight: {
          xs: 'none',
          md: listColumnBorderRightMd,
        },
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: listColumnBgcolor,
        backdropFilter: isMobileLayout ? 'none' : 'blur(12px)',
      }}
    >
      <ChatRoomList
        rooms={rooms}
        loading={roomsLoading}
        currentUserId={uid}
        onStartDm={() => setStartDmOpen(true)}
        onCreateGroup={() => setCreateGroupOpen(true)}
        onRemoveChat={handleRemoveChat}
        onToggleFavorite={handleToggleFavorite}
        chatPathPrefix="/chat-full"
        showMessagesHeading={isMobileLayout}
      />
    </Box>
  );

  const threadColumn = showThread ? (
    <Box
      data-testid="chat-thread-column"
      sx={{
        flex: 1,
        display: { xs: 'flex', md: 'flex' },
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'hidden',
        background: threadColumnBackground,
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
        {...groupMenuHandlers}
        isFavorite={resolvedThreadFavorite}
        onToggleFavorite={
          roomId
            ? () => {
                handleToggleFavorite(roomId, resolvedThreadFavorite).catch(
                  () => {},
                );
              }
            : undefined
        }
        onBack={() => navigate('/chat-full')}
        showBackButton={isMobileLayout}
        onRemoveConversation={
          roomId ? () => handleRemoveChat(roomId) : undefined
        }
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
            onClick={() => {
              refresh();
            }}
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
        <ChatThreadMessageList
          messages={messages}
          currentUserId={uid}
          roomType={room?.room_type ?? 'dm'}
          otherUserId={otherMember?.user_id}
          loadOlderMessages={loadOlderMessages}
          hasOlderMessages={hasOlderMessages}
          loadingOlder={loadingOlder}
          editMessage={editMessage}
          deleteMessage={deleteMessage}
          toggleReaction={toggleReaction}
          markAsRead={markAsRead}
          forwardAuthorLabel={forwardAuthorLabel}
          onReport={(msgId, senderUserId) =>
            handleReport(msgId, senderUserId ?? undefined)
          }
          replyTargetSetter={setReplyTarget}
          onForwardSource={setForwardSource}
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
    </Box>
  ) : null;

  const splitWorkspace = (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        '&::before':
          !isMobileLayout && showThread
            ? {
                content: '""',
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  theme.palette.mode === 'light'
                    ? `radial-gradient(120% 80% at 50% 0%, ${alpha(theme.palette.primary.main, 0.04)} 0%, transparent 55%)`
                    : `radial-gradient(100% 60% at 50% 0%, ${alpha(theme.palette.primary.main, 0.07)} 0%, transparent 50%)`,
                zIndex: 0,
              }
            : undefined,
        '& > *': { position: 'relative', zIndex: 1 },
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
          <Box
            role="region"
            aria-labelledby="chat-dock-title"
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: 'fixed',
              zIndex: 1300,
              top: `${dockTopPx}px`,
              right: 0,
              bottom: 0,
              width: dockWidth,
              maxWidth: 'calc(100vw - 12px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: alpha(theme.palette.background.default, 0.96),
              borderLeft: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.1 : 0.14)}`,
              boxShadow:
                theme.palette.mode === 'light'
                  ? `-6px 0 20px ${alpha(theme.palette.common.black, 0.06)}`
                  : `-8px 0 24px ${alpha(theme.palette.common.black, 0.28)}`,
              transform: 'translateX(0)',
              opacity: 1,
              animation: 'chatDockSlideIn 220ms ease-out',
              '@keyframes chatDockSlideIn': {
                '0%': {
                  transform: 'translateX(24px)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                px: 1.75,
                py: 1,
                flexShrink: 0,
                borderBottom: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.08 : 0.1)}`,
                bgcolor: alpha(
                  theme.palette.background.paper,
                  theme.palette.mode === 'light' ? 0.78 : 0.72,
                ),
                backdropFilter: 'blur(10px)',
                color:
                  theme.palette.mode === 'light'
                    ? theme.palette.text.primary
                    : 'rgba(252,250,255,0.96)',
              }}
            >
              <Typography
                id="chat-dock-title"
                variant="subtitle2"
                fontWeight={700}
                sx={{
                  color:
                    theme.palette.mode === 'light'
                      ? theme.palette.text.primary
                      : 'rgba(252,250,255,0.96)',
                }}
              >
                Messages
              </Typography>
              <IconButton
                aria-label="Close messages"
                onClick={closeDockedChat}
                size="small"
                edge="end"
                sx={{
                  color:
                    theme.palette.mode === 'light'
                      ? theme.palette.text.primary
                      : 'rgba(220,207,248,0.9)',
                }}
              >
                <CloseIcon fontSize="small" />
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
          </Box>,
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
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            bgcolor: alpha(
              theme.palette.common.black,
              theme.palette.mode === 'light' ? 0.04 : 0.14,
            ),
            zIndex: 0,
          },
          '& > *': { position: 'relative', zIndex: 1 },
        }}
      >
        {splitWorkspace}
      </Box>
      {dialogs}
    </Box>
  );
};

import { useTheme, useMediaQuery } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMessenger } from '../../context/MessengerContext';
import { useChatRooms } from '../../hooks/useChat';

/**
 * Redirects /chat and /chat/:roomId:
 * - On mobile: to full chat page (/chat-full, /chat-full/:roomId) so chat works in a dedicated screen.
 * - On desktop: to Feed and opens the messenger overlay (popover).
 * Supports ?with=userId to open or create a DM with that user.
 */
export const ChatRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { roomId } = useParams<{ roomId?: string }>();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const messenger = useMessenger();
  const { rooms, createDm, loading } = useChatRooms();
  const withUserId = searchParams.get('with');
  const handledTargetRef = useRef<string | null>(null);
  const redirectTargetKey = useMemo(
    () => `${roomId ?? ''}|${withUserId ?? ''}`,
    [roomId, withUserId],
  );

  useEffect(() => {
    if (handledTargetRef.current === redirectTargetKey) return;
    const run = async () => {
      // Mobile: use full chat page (works reliably; overlay/popover is cramped on small screens).
      if (mobile) {
        if (roomId) {
          navigate(`/chat-full/${roomId}`, { replace: true });
          return;
        }
        if (withUserId) {
          if (loading) return;
          const existing = rooms.find(
            (r) =>
              r.room_type === 'dm' &&
              r.members?.some((m) => m.user_id === withUserId),
          );
          if (existing) {
            navigate(`/chat-full/${existing.id}`, { replace: true });
          } else {
            try {
              const id = await createDm(withUserId);
              if (id) navigate(`/chat-full/${id}`, { replace: true });
              else navigate('/chat-full', { replace: true });
            } catch {
              navigate('/chat-full', { replace: true });
            }
          }
          return;
        }
        navigate('/chat-full', { replace: true });
        return;
      }

      // Desktop: overlay + popover on Feed
      if (roomId && messenger) {
        handledTargetRef.current = redirectTargetKey;
        messenger.openWithRoom(roomId);
        messenger.openOverlay();
        navigate('/feed', { replace: true });
        return;
      }

      if (withUserId && messenger) {
        if (loading) return;
        handledTargetRef.current = redirectTargetKey;
        const existing = rooms.find(
          (r) =>
            r.room_type === 'dm' &&
            r.members?.some((m) => m.user_id === withUserId),
        );
        if (existing) {
          messenger.openPopOut(existing.id);
          messenger.openOverlay();
        } else {
          try {
            const id = await createDm(withUserId);
            if (id) {
              messenger.openPopOut(id);
              messenger.openOverlay();
            }
          } catch {
            // e.g. blocked, not connected – still go to feed
          }
        }
        navigate('/feed', { replace: true });
        return;
      }

      if (messenger) {
        handledTargetRef.current = redirectTargetKey;
        messenger.openOverlay();
      }
      navigate('/feed', { replace: true });
    };
    void run();
<<<<<<< HEAD
  }, [
    mobile,
    navigate,
    roomId,
    withUserId,
    messenger,
    rooms,
    createDm,
    loading,
  ]);
||||||| parent of 4419ab94 (fixint it)
  }, [navigate, roomId, withUserId, messenger, rooms, createDm, loading]);
=======
  }, [
    navigate,
    roomId,
    withUserId,
    messenger,
    rooms,
    createDm,
    loading,
    redirectTargetKey,
  ]);
>>>>>>> 4419ab94 (fixint it)

  return null;
};

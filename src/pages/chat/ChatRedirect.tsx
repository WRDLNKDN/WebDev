import { useTheme, useMediaQuery } from '@mui/material';
import { useEffect, useRef } from 'react';
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
  const handledKeyRef = useRef<string | null>(null);
  const actionKey = `${mobile ? 'mobile' : 'desktop'}|${roomId ?? ''}|${withUserId ?? ''}`;

  // Safety valve: if chat room loading stalls, never leave the user on a blank /chat route.
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => {
      if (mobile) navigate('/chat-full', { replace: true });
      else navigate('/feed', { replace: true });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [loading, mobile, navigate]);

  useEffect(() => {
    if (loading) return;
    if (handledKeyRef.current === actionKey) return;
    handledKeyRef.current = actionKey;
    let cancelled = false;

    const run = async () => {
      // Mobile: use full chat page (works reliably; overlay/popover is cramped on small screens).
      if (mobile) {
        if (roomId) {
          if (cancelled) return;
          navigate(`/chat-full/${roomId}`, { replace: true });
          return;
        }
        if (withUserId) {
          const existing = rooms.find(
            (r) =>
              r.room_type === 'dm' &&
              r.members?.some((m) => m.user_id === withUserId),
          );
          if (existing) {
            if (cancelled) return;
            navigate(`/chat-full/${existing.id}`, { replace: true });
          } else {
            try {
              const id = await createDm(withUserId);
              if (cancelled) return;
              if (id) navigate(`/chat-full/${id}`, { replace: true });
              else navigate('/chat-full', { replace: true });
            } catch {
              if (cancelled) return;
              navigate('/chat-full', { replace: true });
            }
          }
          return;
        }
        if (cancelled) return;
        navigate('/chat-full', { replace: true });
        return;
      }

      // Desktop: overlay + popover on Feed
      if (roomId && messenger) {
        messenger.openWithRoom(roomId);
        if (!messenger.overlayOpen) messenger.toggleOverlay();
        if (cancelled) return;
        navigate('/feed', { replace: true });
        return;
      }

      if (withUserId && messenger) {
        const existing = rooms.find(
          (r) =>
            r.room_type === 'dm' &&
            r.members?.some((m) => m.user_id === withUserId),
        );
        if (existing) {
          messenger.openPopOut(existing.id);
          if (!messenger.overlayOpen) messenger.toggleOverlay();
        } else {
          try {
            const id = await createDm(withUserId);
            if (cancelled) return;
            if (id) {
              messenger.openPopOut(id);
              if (!messenger.overlayOpen) messenger.toggleOverlay();
            }
          } catch {
            // e.g. blocked, not connected – still go to feed
          }
        }
        if (cancelled) return;
        navigate('/feed', { replace: true });
        return;
      }

      if (messenger) {
        if (!messenger.overlayOpen) messenger.toggleOverlay();
      }
      if (cancelled) return;
      navigate('/feed', { replace: true });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    mobile,
    navigate,
    roomId,
    withUserId,
    messenger,
    actionKey,
    rooms,
    createDm,
    loading,
  ]);

  return null;
};

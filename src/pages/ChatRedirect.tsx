import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMessenger } from '../context/MessengerContext';
import { useChatRooms } from '../hooks/useChat';

/**
 * Redirects /chat and /chat/:roomId to Feed and opens the messenger overlay.
 * Chat is handled entirely in the overlay popup, not as its own page.
 * Supports ?with=userId to open or create a DM with that user.
 */
export const ChatRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { roomId } = useParams<{ roomId?: string }>();
  const messenger = useMessenger();
  const { rooms, createDm, loading } = useChatRooms();
  const withUserId = searchParams.get('with');

  useEffect(() => {
    const run = async () => {
      if (roomId && messenger) {
        messenger.openWithRoom(roomId);
        messenger.toggleOverlay();
        navigate('/feed', { replace: true });
        return;
      }

      // Wait for rooms to load before resolving ?with= to avoid duplicate DMs
      if (withUserId && messenger) {
        if (loading) return;
        const existing = rooms.find(
          (r) =>
            r.room_type === 'dm' &&
            r.members?.some((m) => m.user_id === withUserId),
        );
        if (existing) {
          messenger.openPopOut(existing.id);
          messenger.toggleOverlay();
        } else {
          try {
            const id = await createDm(withUserId);
            if (id) {
              messenger.openPopOut(id);
              messenger.toggleOverlay();
            }
          } catch {
            // e.g. blocked, not connected – still go to feed
          }
        }
        navigate('/feed', { replace: true });
        return;
      }

      if (messenger) {
        messenger.toggleOverlay();
      }
      navigate('/feed', { replace: true });
    };
    void run();
  }, [navigate, roomId, withUserId, messenger, rooms, createDm, loading]);

  return null;
};

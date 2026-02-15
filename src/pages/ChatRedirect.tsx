import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMessenger } from '../context/MessengerContext';

/**
 * Redirects /chat and /chat/:roomId to Feed and opens the messenger overlay.
 * Chat is handled entirely in the overlay popup, not as its own page.
 */
export const ChatRedirect = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const messenger = useMessenger();

  useEffect(() => {
    if (roomId && messenger) {
      messenger.openWithRoom(roomId);
    } else if (messenger) {
      messenger.toggleOverlay();
    }
    navigate('/feed', { replace: true });
  }, [navigate, roomId, messenger]);

  return null;
};

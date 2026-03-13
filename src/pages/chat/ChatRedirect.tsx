import { useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMessenger } from '../../context/MessengerContext';
import { useChatRooms } from '../../hooks/useChat';
import { findCanonicalDmRoom } from '../../lib/chat/findCanonicalDmRoom';
import { supabase } from '../../lib/auth/supabaseClient';

/**
 * Redirects /chat and /chat/:roomId:
 * - On mobile: to full chat page (/chat-full, /chat-full/:roomId).
 * - On desktop: to Feed and opens the messenger overlay.
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const withUserId = searchParams.get('with');
  const handledTargetRef = useRef<string | null>(null);
  const redirectTargetKey = `${mobile ? 'mobile' : 'desktop'}|${roomId ?? ''}|${withUserId ?? ''}`;

  // Safety valve: never leave the user stranded on /chat if room loading stalls.
  useEffect(() => {
    if (!loading) return;

    const timer = window.setTimeout(() => {
      if (mobile) navigate('/chat-full', { replace: true });
      else navigate('/feed', { replace: true });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [loading, mobile, navigate]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) setCurrentUserId(session?.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (handledTargetRef.current === redirectTargetKey) return;

    let cancelled = false;

    const run = async () => {
      handledTargetRef.current = redirectTargetKey;

      if (mobile) {
        if (roomId) {
          if (!cancelled) navigate(`/chat-full/${roomId}`, { replace: true });
          return;
        }

        if (withUserId) {
          const canonicalExisting = currentUserId
            ? findCanonicalDmRoom(rooms, currentUserId, withUserId)
            : null;
          if (canonicalExisting) {
            if (!cancelled) {
              navigate(`/chat-full/${canonicalExisting.id}`, { replace: true });
            }
            return;
          }

          try {
            const id = await createDm(withUserId);
            if (cancelled) return;
            navigate(id ? `/chat-full/${id}` : '/chat-full', {
              replace: true,
            });
          } catch {
            if (!cancelled) navigate('/chat-full', { replace: true });
          }
          return;
        }

        if (!cancelled) navigate('/chat-full', { replace: true });
        return;
      }

      if (roomId && messenger) {
        messenger.openWithRoom(roomId);
        messenger.openOverlay();
        if (!cancelled) navigate('/feed', { replace: true });
        return;
      }

      if (withUserId && messenger) {
        const existing = currentUserId
          ? findCanonicalDmRoom(rooms, currentUserId, withUserId)
          : null;

        if (existing) {
          messenger.openPopOut(existing.id);
          messenger.openOverlay();
        } else {
          try {
            const id = await createDm(withUserId);
            if (cancelled) return;
            if (id) {
              messenger.openPopOut(id);
              messenger.openOverlay();
            }
          } catch {
            // Fall through to feed if DM creation fails.
          }
        }

        if (!cancelled) navigate('/feed', { replace: true });
        return;
      }

      if (messenger) {
        messenger.openOverlay();
      }

      if (!cancelled) navigate('/feed', { replace: true });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    createDm,
    currentUserId,
    loading,
    messenger,
    mobile,
    navigate,
    redirectTargetKey,
    roomId,
    rooms,
    withUserId,
  ]);

  return null;
};

import { useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppToast } from '../../context/AppToastContext';
import { useMessenger } from '../../context/MessengerContext';
import { useChatRooms } from '../../hooks/useChat';
import { findCanonicalDmRoom } from '../../lib/chat/findCanonicalDmRoom';
import { supabase } from '../../lib/auth/supabaseClient';
import { toMessage } from '../../lib/utils/errors';

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
  const { showToast } = useAppToast();
  const { rooms, createDm, loading } = useChatRooms();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const withUserId = searchParams.get('with');
  /** Bumps on each effect run so Strict Mode / stale async work does not apply after a newer run. */
  const redirectRunGenRef = useRef(0);
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
    // ?with= needs session id for canonical room lookup; avoid async createDm-only path until then
    // (Strict Mode + null currentUserId otherwise skips popout and still navigates to /feed).
    if (withUserId && !currentUserId) return;

    const myGen = ++redirectRunGenRef.current;
    let cancelled = false;
    const stillValid = () => !cancelled && myGen === redirectRunGenRef.current;

    const run = async () => {
      if (mobile) {
        if (roomId) {
          if (!cancelled) navigate(`/chat-full/${roomId}`, { replace: true });
          return;
        }

        if (withUserId) {
          const canonicalExisting = findCanonicalDmRoom(
            rooms,
            currentUserId!,
            withUserId,
          );
          if (canonicalExisting) {
            if (stillValid()) {
              navigate(`/chat-full/${canonicalExisting.id}`, { replace: true });
            }
            return;
          }

          try {
            const id = await createDm(withUserId);
            if (!stillValid()) return;
            navigate(id ? `/chat-full/${id}` : '/chat-full', {
              replace: true,
            });
          } catch (e) {
            if (stillValid()) {
              showToast({
                message: toMessage(e) || 'Could not start conversation.',
                severity: 'error',
              });
              navigate('/chat-full', { replace: true });
            }
          }
          return;
        }

        if (stillValid()) navigate('/chat-full', { replace: true });
        return;
      }

      if (roomId && messenger) {
        messenger.openWithRoom(roomId);
        messenger.openOverlay();
        if (stillValid()) navigate('/feed', { replace: true });
        return;
      }

      if (withUserId && messenger) {
        const existing = findCanonicalDmRoom(rooms, currentUserId!, withUserId);

        if (existing) {
          if (!stillValid()) return;
          messenger.openPopOut(existing.id);
        } else {
          try {
            const id = await createDm(withUserId);
            if (!stillValid()) return;
            if (id) {
              messenger.openPopOut(id);
            }
          } catch (e) {
            if (stillValid()) {
              showToast({
                message: toMessage(e) || 'Could not start conversation.',
                severity: 'error',
              });
            }
          }
        }

        if (stillValid()) navigate('/feed', { replace: true });
        return;
      }

      if (messenger) {
        messenger.openOverlay();
      }

      if (stillValid()) navigate('/feed', { replace: true });
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
    showToast,
    withUserId,
  ]);

  return null;
};

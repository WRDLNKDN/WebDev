import { useCallback } from 'react';
import { formatForwardedChatText } from '../lib/chat/formatForwardedChatText';
import type { MessageWithExtras } from './chatTypes';

type ShowForwardToast = (args: {
  message: string;
  severity: 'success';
}) => void;

/**
 * Shared forward-message author label + room submit handler (full chat, popup, popover).
 */
export function useChatForwardToRoomFlow(
  forwardMessage: (targetRoomId: string, body: string) => Promise<boolean>,
  forwardSource: MessageWithExtras | null,
  setForwardSource: (value: MessageWithExtras | null) => void,
  showToast: ShowForwardToast,
) {
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
    [
      forwardAuthorLabel,
      forwardMessage,
      forwardSource,
      setForwardSource,
      showToast,
    ],
  );

  return { forwardAuthorLabel, handleForwardToRoom };
}

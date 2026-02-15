import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

type MessengerContextValue = {
  overlayOpen: boolean;
  toggleOverlay: () => void;
  /** Open overlay and optionally select a room (opens popover if roomId provided). */
  openWithRoom: (roomId: string) => void;
  /** Open a room in an in-page floating popover (not a new window). */
  openPopOut: (roomId: string) => void;
  /** Close the floating chat popover. */
  closePopover: () => void;
  /** Currently open chat room in the popover, or null. */
  popoverRoomId: string | null;
  pendingRoomIdRef: React.MutableRefObject<string | null>;
};

const MessengerContext = createContext<MessengerContextValue | null>(null);

export const MessengerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [popoverRoomId, setPopoverRoomId] = useState<string | null>(null);
  const pendingRoomIdRef = useRef<string | null>(null);
  const toggleOverlay = useCallback(() => {
    setOverlayOpen((prev) => !prev);
  }, []);
  const openPopOut = useCallback((roomId: string) => {
    setPopoverRoomId(roomId);
  }, []);
  const closePopover = useCallback(() => {
    setPopoverRoomId(null);
  }, []);
  const openWithRoom = useCallback((roomId: string) => {
    setPopoverRoomId(roomId);
  }, []);
  const value = useMemo(
    () => ({
      overlayOpen,
      toggleOverlay,
      openWithRoom,
      openPopOut,
      closePopover,
      popoverRoomId,
      pendingRoomIdRef,
    }),
    [
      overlayOpen,
      toggleOverlay,
      openWithRoom,
      openPopOut,
      closePopover,
      popoverRoomId,
    ],
  );
  return (
    <MessengerContext.Provider value={value}>
      {children}
    </MessengerContext.Provider>
  );
};

export const useMessenger = () => {
  const ctx = useContext(MessengerContext);
  if (!ctx) return null;
  return ctx;
};

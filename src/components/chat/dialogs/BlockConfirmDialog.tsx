import { ChatDestructiveConfirmDialog } from './ChatDestructiveConfirmDialog';

type BlockConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  displayName?: string;
};

export const BlockConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  displayName = 'this member',
}: BlockConfirmDialogProps) => (
  <ChatDestructiveConfirmDialog
    open={open}
    onClose={onClose}
    title={`Block ${displayName}`}
    body={
      <>
        Blocking will remove your connection with {displayName} and prevent
        future interactions. You can unblock later in Settings.
      </>
    }
    confirmLabel="Confirm"
    onConfirm={onConfirm}
  />
);

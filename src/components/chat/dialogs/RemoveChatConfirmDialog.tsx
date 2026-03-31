import { ChatDestructiveConfirmDialog } from './ChatDestructiveConfirmDialog';

type RemoveChatConfirmDialogProps = {
  open: boolean;
  roomLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export const RemoveChatConfirmDialog = ({
  open,
  roomLabel,
  onClose,
  onConfirm,
}: RemoveChatConfirmDialogProps) => (
  <ChatDestructiveConfirmDialog
    open={open}
    onClose={onClose}
    title="Remove conversation"
    body={
      <>
        Are you sure you want to remove{' '}
        <strong>{roomLabel || 'this conversation'}</strong> from your messages?
        It will disappear from your list; you can start a new chat with the same
        people later if you need to.
      </>
    }
    confirmLabel="Remove"
    onConfirm={onConfirm}
  />
);

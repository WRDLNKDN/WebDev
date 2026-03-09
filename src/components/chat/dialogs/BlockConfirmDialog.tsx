import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

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
}: BlockConfirmDialogProps) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Block {displayName}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Blocking will remove your connection with {displayName} and prevent
          future interactions. You can unblock later in Settings.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => void handleConfirm()}
          color="error"
          variant="contained"
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

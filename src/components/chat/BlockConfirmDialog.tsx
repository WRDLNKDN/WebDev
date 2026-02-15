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
  displayName = 'this user',
}: BlockConfirmDialogProps) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Block user</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Block {displayName}? You will not be able to message each other.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => void handleConfirm()}
          color="error"
          variant="contained"
        >
          Block
        </Button>
      </DialogActions>
    </Dialog>
  );
};
